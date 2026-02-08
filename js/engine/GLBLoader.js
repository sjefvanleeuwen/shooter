export class GLBLoader {
    static async loadVideo(url) {
        throw new Error("Not implemented");
    }

    static async load(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load GLB from ${url}: ${response.status} ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength < 12) {
            throw new Error(`Invalid GLB file at ${url}: file too small (${buffer.byteLength} bytes)`);
        }
        return this.parse(buffer);
    }

    static parse(buffer) {
        const dataView = new DataView(buffer);
        let offset = 0;

        // Header
        const magic = dataView.getUint32(offset, true);
        offset += 4;
        const version = dataView.getUint32(offset, true);
        offset += 4;
        const length = dataView.getUint32(offset, true);
        offset += 4;

        if (magic !== 0x46546C67) throw new Error('Invalid GLB magic');

        // Chunks
        let jsonChunk, binChunk;
        
        while (offset < length) {
            const chunkLength = dataView.getUint32(offset, true);
            offset += 4;
            const chunkType = dataView.getUint32(offset, true);
            offset += 4;

            if (chunkType === 0x4E4F534A) { // JSON
                const jsonBytes = new Uint8Array(buffer, offset, chunkLength);
                const jsonStr = new TextDecoder().decode(jsonBytes);
                jsonChunk = JSON.parse(jsonStr);
            } else if (chunkType === 0x004E4942) { // BIN
                binChunk = new Uint8Array(buffer, offset, chunkLength);
            }

            offset += chunkLength;
        }

        if (!jsonChunk || !binChunk) throw new Error('Missing GLB chunks');

        return this.processJSON(jsonChunk, binChunk);
    }

    static processJSON(json, bin) {
        // We only grab the first primitive of the first mesh for simplicity
        const mesh = json.meshes[0];
        const primitive = mesh.primitives[0];
        
        const attributes = primitive.attributes;
        const positionAccessor = json.accessors[attributes.POSITION];
        const normalAccessor = json.accessors[attributes.NORMAL];
        const uvAccessor = json.accessors[attributes.TEXCOORD_0];
        const indicesAccessor = json.accessors[primitive.indices];
        
        // Helper to slice buffer correctly based on types
        // This is a minimal implementation assuming standard GLB exports (Float32 vertices)
        
        const extractData = (accessor) => {
            const bufferView = json.bufferViews[accessor.bufferView];
            const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
            
            // 5126 = FLOAT, 5123 = UNSIGNED_SHORT, 5121 = UNSIGNED_BYTE, 5125 = UNSIGNED_INT
            const componentType = accessor.componentType; 
            const count = accessor.count;
            
            // Determine size
            let componentSize = 4;
            if (componentType === 5123) componentSize = 2; // UShort
            if (componentType === 5121) componentSize = 1; // UByte
            if (componentType === 5125) componentSize = 4; // UInt
            if (componentType === 5126) componentSize = 4; // Float
            
            let numComponents = 1; // SCALAR
            if (accessor.type === 'VEC3') numComponents = 3;
            if (accessor.type === 'VEC2') numComponents = 2;
            if (accessor.type === 'VEC4') numComponents = 4;
            if (accessor.type === 'MAT4') numComponents = 16;
            
            const byteLength = count * numComponents * componentSize;
            
            return new Uint8Array(bin.buffer, bin.byteOffset + start, byteLength);
        };

        // Extract Texture
        let textureImage = null;
        let emissiveImage = null;
        let metallicRoughnessImage = null;

        if (primitive.material !== undefined) {
             const material = json.materials[primitive.material];
             
             const extractImageBlob = (texInfo) => {
                 if (!texInfo) return null;
                 const texture = json.textures[texInfo.index];
                 if (texture.source === undefined) return null;
                 const image = json.images[texture.source];
                 
                 const bufferView = json.bufferViews[image.bufferView];
                 const start = (bufferView.byteOffset || 0);
                 const length = bufferView.byteLength;
                 
                 const imgBytes = new Uint8Array(bin.buffer, bin.byteOffset + start, length);
                 return new Blob([imgBytes], { type: image.mimeType || 'image/png' });
             };

             if (material.pbrMetallicRoughness) {
                 if (material.pbrMetallicRoughness.baseColorTexture) {
                     textureImage = extractImageBlob(material.pbrMetallicRoughness.baseColorTexture);
                 }
                 if (material.pbrMetallicRoughness.metallicRoughnessTexture) {
                     metallicRoughnessImage = extractImageBlob(material.pbrMetallicRoughness.metallicRoughnessTexture);
                 }
             }

             if (material.emissiveTexture) {
                 emissiveImage = extractImageBlob(material.emissiveTexture);
             }
        }

        // Texture extraction above, now let's get material factors
        let baseColorFactor = [1, 1, 1, 1];
        let metallicFactor = 1.0;
        let roughnessFactor = 1.0;
        let emissiveFactor = [0, 0, 0];

        if (primitive.material !== undefined) {
            const material = json.materials[primitive.material];
            if (material.pbrMetallicRoughness) {
                const pbr = material.pbrMetallicRoughness;
                if (pbr.baseColorFactor) baseColorFactor = pbr.baseColorFactor;
                if (pbr.metallicFactor !== undefined) metallicFactor = pbr.metallicFactor;
                if (pbr.roughnessFactor !== undefined) roughnessFactor = pbr.roughnessFactor;
            }
            if (material.emissiveFactor) emissiveFactor = material.emissiveFactor;
            
            // Fix: If emissive texture exists but factor is black (default), make it white, otherwise we multiply by zero
            if (emissiveImage && emissiveFactor[0] === 0 && emissiveFactor[1] === 0 && emissiveFactor[2] === 0) {
                 emissiveFactor = [1, 1, 1];
            }
        }

        return {
            positions: extractData(positionAccessor),
            normals: normalAccessor ? extractData(normalAccessor) : null,
            uvs: uvAccessor ? extractData(uvAccessor) : null,
            indices: indicesAccessor ? extractData(indicesAccessor) : null,
            indexType: indicesAccessor ? indicesAccessor.componentType : 5123, // Default to UNSIGNED_SHORT if derived
            vertexCount: indicesAccessor ? indicesAccessor.count : positionAccessor.count,
            texture: textureImage,
            emissive: emissiveImage,
            metallicRoughness: metallicRoughnessImage,
            material: {
                baseColorFactor,
                metallicFactor,
                roughnessFactor,
                emissiveFactor
            }
        };
    }

    static getElementSize(type) {
        if (type === 'VEC3') return 3;
        if (type === 'VEC2') return 2;
        return 1;
    }
}
