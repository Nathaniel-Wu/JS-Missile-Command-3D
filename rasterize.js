//---------------------------------------------- Game Framework

class Utilities {
    static get_JSON(url) {
        try {
            if ((typeof (url) !== "string"))
                throw "get_JSON: parameter not a string";
            else {
                var http_request = new XMLHttpRequest();
                http_request.open("GET", url, false);
                http_request.send(null);
                var startTime = Date.now();
                while ((http_request.status !== 200) && (http_request.readyState !== XMLHttpRequest.DONE))
                    if ((Date.now() - startTime) > 3000)
                        break;
                if ((http_request.status !== 200) || (http_request.readyState !== XMLHttpRequest.DONE))
                    throw "Unable to acquire file!";
                else
                    return JSON.parse(http_request.response);
            }
        } catch (e) { console.log(e); return null; }
    }

    static get_File(url) {
        try {
            if ((typeof (url) !== "string"))
                throw "get_File: parameter not a string";
            else {
                var http_request = new XMLHttpRequest();
                http_request.open("GET", url, false);
                http_request.send(null);
                var startTime = Date.now();
                while ((http_request.status !== 200) && (http_request.readyState !== XMLHttpRequest.DONE))
                    if ((Date.now() - startTime) > 3000)
                        break;
                if ((http_request.status !== 200) || (http_request.readyState !== XMLHttpRequest.DONE))
                    throw "Unable to acquire file!";
                else
                    return http_request.response;
            }
        } catch (e) { console.log(e); return null; }
    }
}

class Game_Base {
    constructor(framerate, plane_z) {
        this.background_canvas = null;
        this.background_context = null;
        this.gl_canvas = null;
        this.gl = null;
        this.canvas_x = 0;
        this.canvas_y = 0;
        this.loop_handle = null;
        this.framerate = framerate;
        this.frametime = 1000 / this.framerate;
        this.restart_flag = false;
        this.level_load_functions = new Array();
        this.plane_z = plane_z;
        this.camera_position = null;
        this.camera_look_at = null;
        this.camera_up = null;
        this.camera_fov = null;
        this.camera_near_z = null;
        this.camera_far_z = null;
        this.light_position = null;
        this.light_ambient = null;
        this.light_diffuse = null;
        this.light_specular = null;
        this.textures = new Array();
        this.vPosAttribLoc = null;
        this.vNormAttribLoc = null;
        this.vUVAttribLoc = null;
        this.mMatrixULoc = null;
        this.pvmMatrixULoc = null;
        this.ambientULoc = null;
        this.diffuseULoc = null;
        this.specularULoc = null;
        this.shininessULoc = null;
        this.alphaULoc = null;
        this.modulationULoc = null;
        this.textureULoc = null;
        this.pvMatrix = null;
    }

    start() {
        try {
        this.init();
        this.load();
        this.start_loop();
        } catch (e) { console.log(e); }
    }

    stop() {
        this.stop_loop();
        this.deload();
    }

    restart() {
        this.stop();
        this.load();
        this.start_loop();
    }

    init() {
        this.gl_canvas = document.getElementById("gl_canvas");
        this.canvas_x = this.gl_canvas.getBoundingClientRect().left;
        this.canvas_y = this.gl_canvas.getBoundingClientRect().top;
        this.gl_canvas.setAttribute("style", "position: absolute; left: " + this.canvas_x + "px; top: " + this.canvas_y + "px; z-index: 1;");
        this.background_canvas = document.createElement("canvas");
        this.background_canvas.setAttribute("width", this.gl_canvas.width);
        this.background_canvas.setAttribute("height", this.gl_canvas.height);
        this.background_canvas.setAttribute("style", "position: absolute; left: " + this.canvas_x + "px; top: " + this.canvas_y + "px; z-index: 0;");
        document.getElementById("game").appendChild(this.background_canvas);
        this.background_context = this.background_canvas.getContext("2d");
        this.gl = this.gl_canvas.getContext("webgl");
        if (!this.gl) throw "WebGL not supported error.";
        // this.gl_canvas.addEventListener("mousedown", onMouseDown);
        // this.gl_canvas.addEventListener("mouseup", onMouseUp);
        var camera_JSON = Utilities.get_JSON("camera.json");
        this.camera_position = vec3.fromValues(camera_JSON.position[0], camera_JSON.position[1], camera_JSON.position[2]);
        this.camera_look_at = vec3.fromValues(camera_JSON.look_at[0], camera_JSON.look_at[1], camera_JSON.look_at[2]);
        this.camera_up = vec3.fromValues(camera_JSON.up[0], camera_JSON.up[1], camera_JSON.up[2]);
        this.camera_fov = camera_JSON.fov;
        this.camera_near_z = camera_JSON.near_z;
        this.camera_far_z = camera_JSON.far_z;
        var light_JSON = Utilities.get_JSON("light.json");
        this.light_position = vec3.fromValues(light_JSON.position[0], light_JSON.position[1], light_JSON.position[2]);
        this.light_ambient = vec3.fromValues(light_JSON.ambient[0], light_JSON.ambient[1], light_JSON.ambient[2]);
        this.light_diffuse = vec3.fromValues(light_JSON.diffuse[0], light_JSON.diffuse[1], light_JSON.diffuse[2]);
        this.light_specular = vec3.fromValues(light_JSON.specular[0], light_JSON.specular[1], light_JSON.specular[2]);
        this.init_shaders();
    }

    init_shaders() {
        var vertex_shader_code = `
            attribute vec3 aVertexPosition;
            attribute vec3 aVertexNormal;
            attribute vec2 aVertexUV;
            uniform mat4 umMatrix;
            uniform mat4 upvmMatrix;
            varying vec3 vWorldPos;
            varying vec2 vVertexUV;
            varying vec3 vVertexNormal;
            void main(void) {
                vec4 vWorldPos4 = umMatrix * vec4(aVertexPosition, 1.0);
                vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
                gl_Position = upvmMatrix * vec4(aVertexPosition, 1.0);
                gl_Position.x = -gl_Position.x;
                vec4 vWorldNormal4 = umMatrix * vec4(aVertexNormal, 0.0);
                vVertexUV = aVertexUV;
                vVertexNormal = normalize(vec3(vWorldNormal4.x,vWorldNormal4.y,vWorldNormal4.z)); 
            }
        `;
        var fragment_shader_code = `
            precision highp float;
            uniform vec3 uEyePosition;
            uniform vec3 uLightAmbient;
            uniform vec3 uLightDiffuse;
            uniform vec3 uLightSpecular;
            uniform vec3 uLightPosition;
            uniform vec3 uAmbient;
            uniform vec3 uDiffuse;
            uniform vec3 uSpecular;
            uniform float uShininess;
            uniform float uAlpha;
            uniform sampler2D uTexture;
            varying vec3 vWorldPos;
            varying vec2 vVertexUV;
            varying vec3 vVertexNormal;
            void main(void) {
                vec3 ambient = uAmbient*uLightAmbient;
                vec3 normal = normalize(vVertexNormal); 
                vec3 light = normalize(uLightPosition - vWorldPos);
                float lambert = max(0.0,dot(normal,light));
                vec3 diffuse = uDiffuse*uLightDiffuse*lambert;
                vec3 eye = normalize(uEyePosition - vWorldPos);
                vec3 halfVec = normalize(light+eye);
                float highlight = pow(max(0.0,dot(normal,halfVec)),uShininess);
                vec3 specular = uSpecular*uLightSpecular*highlight;
                vec3 Cf = ambient + diffuse + specular;
                float Af = uAlpha;
                vec4 texture = texture2D(uTexture, vVertexUV);
                vec3 Ct = vec3(texture[0], texture[1], texture[2]);
                float At = texture[3];
                gl_FragColor = vec4(Cf*Ct, Af*At);
            }
        `;
        var vertex_shader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vertex_shader, vertex_shader_code);
        this.gl.compileShader(vertex_shader);
        var fragment_shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fragment_shader, fragment_shader_code);
        this.gl.compileShader(fragment_shader);
        if (!this.gl.getShaderParameter(vertex_shader, this.gl.COMPILE_STATUS)) {
            this.gl.deleteShader(vertex_shader);
            throw "error during vertex shader compile: " + this.gl.getShaderInfoLog(vertex_shader);
        } else if (!this.gl.getShaderParameter(fragment_shader, this.gl.COMPILE_STATUS)) {
            this.gl.deleteShader(fragment_shader);
            throw "error during fragment shader compile: " + this.gl.getShaderInfoLog(fragment_shader);
        } else {
            var shader_program = this.gl.createProgram();
            this.gl.attachShader(shader_program, vertex_shader);
            this.gl.attachShader(shader_program, fragment_shader);
            this.gl.linkProgram(shader_program);
            if (!this.gl.getProgramParameter(shader_program, this.gl.LINK_STATUS))
                throw "error during shader program linking: " + this.gl.getProgramInfoLog(shader_program);
            else {
                this.gl.useProgram(shader_program);
                this.vPosAttribLoc = this.gl.getAttribLocation(shader_program, "aVertexPosition");
                this.gl.enableVertexAttribArray(this.vPosAttribLoc);
                this.vNormAttribLoc = this.gl.getAttribLocation(shader_program, "aVertexNormal");
                this.gl.enableVertexAttribArray(this.vNormAttribLoc);
                this.vUVAttribLoc = this.gl.getAttribLocation(shader_program, "aVertexUV");
                this.gl.enableVertexAttribArray(this.vUVAttribLoc);
                this.mMatrixULoc = this.gl.getUniformLocation(shader_program, "umMatrix");
                this.pvmMatrixULoc = this.gl.getUniformLocation(shader_program, "upvmMatrix");
                this.ambientULoc = this.gl.getUniformLocation(shader_program, "uAmbient");
                this.diffuseULoc = this.gl.getUniformLocation(shader_program, "uDiffuse");
                this.specularULoc = this.gl.getUniformLocation(shader_program, "uSpecular");
                this.shininessULoc = this.gl.getUniformLocation(shader_program, "uShininess");
                this.alphaULoc = this.gl.getUniformLocation(shader_program, "uAlpha");
                this.textureULoc = this.gl.getUniformLocation(shader_program, "uTexture");
                this.gl.uniform3fv(this.gl.getUniformLocation(shader_program, "uEyePosition"), this.camera_position);
                this.gl.uniform3fv(this.gl.getUniformLocation(shader_program, "uLightPosition"), this.light_position);
                this.gl.uniform3fv(this.gl.getUniformLocation(shader_program, "uLightAmbient"), this.light_ambient);
                this.gl.uniform3fv(this.gl.getUniformLocation(shader_program, "uLightDiffuse"), this.light_diffuse);
                this.gl.uniform3fv(this.gl.getUniformLocation(shader_program, "uLightSpecular"), this.light_specular);
            }
        }
    }

    load_texture(url) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        const level = 0;
        const internalFormat = this.gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = this.gl.RGBA;
        const srcType = this.gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]);
        this.gl.texImage2D(this.gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
        const image = new Image(), t = this;
        image.crossOrigin = "Anonymous";
        image.src = url;
        image.onload = function () {
            t.gl.bindTexture(t.gl.TEXTURE_2D, texture);
            t.gl.texImage2D(t.gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
            function isPowerOf2(value) { return (value & (value - 1)) == 0; }
            if (isPowerOf2(image.width) && isPowerOf2(image.height))
                t.gl.generateMipmap(t.gl.TEXTURE_2D);
            else {
                t.gl.texParameteri(t.gl.TEXTURE_2D, t.gl.TEXTURE_WRAP_S, t.gl.CLAMP_TO_EDGE);
                t.gl.texParameteri(t.gl.TEXTURE_2D, t.gl.TEXTURE_WRAP_T, t.gl.CLAMP_TO_EDGE);
                t.gl.texParameteri(t.gl.TEXTURE_2D, t.gl.TEXTURE_MIN_FILTER, t.gl.LINEAR);
            }
        };
        this.textures.push({ 'texture': texture, 'url': url });
        return this.textures.length - 1;
    }

    retrieve_texture_by_index(index) {
        return this.textures[index].texture;
    }

    retrieve_texture_index_by_url(url) {
        for (var i = 0; i < this.textures.length; i++)
            if (this.textures[i].url === url)
                return i;
        return null;
    }

    load() {
        var background_image = new Image(), t = this;
        background_image.crossOrigin = "Anonymous";
        background_image.src = "sky-2048.jpg";
        background_image.onload = function () { t.background_context.drawImage(background_image, 0, 0, background_image.width, background_image.height, 0, 0, t.background_canvas.width, t.background_canvas.height); }
        this.gl.clearDepth(1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
    }

    add_level(level_load_function) {
        this.level_load_functions.push(level_load_function);
    }

    load_level(index) {
        if (0 > index && index > this.level_load_functions.length)
            throw "Invalid level index error";
        this.level_load_functions[index]();
    }

    deload() { }

    update() {
        if (this.restart_flag) {
            this.restart_flag = false;
            this.restart();
        }
    }

    draw() {
        var pMatrix = mat4.create();
        var vMatrix = mat4.create();
        this.pvMatrix = mat4.create();
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        mat4.perspective(pMatrix, this.camera_fov * Math.PI / 180, this.gl_canvas.width / this.gl_canvas.height, this.camera_near_z, this.camera_far_z);
        var look_point = vec3.create(); vec3.add(look_point, this.camera_position, this.camera_look_at)
        mat4.lookAt(vMatrix, this.camera_position, look_point, this.camera_up);
        mat4.multiply(this.pvMatrix, this.pvMatrix, pMatrix);
        mat4.multiply(this.pvMatrix, this.pvMatrix, vMatrix);
    }

    loop() {
        if (this.frame_time_log) {
            loop_count++;
            var frame_time = (new Date()).getTime();
        }
        this.update();
        this.draw();
    }

    start_loop() {
        if (this.loop_handle)
            throw "Already in loop error";
        var t = this;
        this.loop_handle = setInterval(function () { t.loop(); }, this.inter_frame);
    }

    stop_loop() {
        if (!this.loop_handle)
            throw "Not in loop error";
        clearInterval(this.loop_handle);
        this.loop_handle = null;
    }
}

class Game_Object {
    constructor(x, y, w, h, game) {
        if (!game.gl_canvas)
            throw "Canvas existence error";
        if (typeof x != 'number' || typeof y != 'number' || typeof w != 'number' || typeof h != 'number')
            throw "Non-number parameter error";
        this.game = game;
        //2D logic
        this.position = vec3.fromValues(x, y, game.plane_z);//Bottom-left
        this.w = w;
        this.h = h;
        this.moveVect = null;
        //3D rendering
        this.vertexBuffer = this.game.gl.createBuffer();
        this.normalBuffer = this.game.gl.createBuffer();
        this.uvBuffer = this.game.gl.createBuffer();
        this.triangleBuffer = this.game.gl.createBuffer();
        this.triangle_count = 0;
        this.texture_index = null;
        this.model = null; this.load_model(); this.fill_buffers(); this.attatch_texture(this.model.texture_url);
        this.model_transform = null; this.make_model_transform();
        this.transform = null;
        this.scaler = null;
        this.xAxis = vec3.fromValues(1.0, 0.0, 0.0);
        this.yAxis = vec3.fromValues(0.0, 1.0, 0.0);
        this.translation = vec3.create();
    }

    load_model() { /* Use either Model.make_procedurally() or Model.read_from_JSON() to make sure this.model is initialized */ }

    fill_buffers() {
        var vertices = new Array(), normals = new Array(), uvs = new Array();
        for (var i = 0; i < this.model.vertices.length; i++) {
            vertices.push(this.model.vertices[i].position[0], this.model.vertices[i].position[1], this.model.vertices[i].position[2]);
            normals.push(this.model.vertices[i].normal[0], this.model.vertices[i].normal[1], this.model.vertices[i].normal[2]);
            uvs.push(this.model.vertices[i].uv[0], this.model.vertices[i].uv[1]);
        }
        this.game.gl.bindBuffer(this.game.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.game.gl.bufferData(this.game.gl.ARRAY_BUFFER, new Float32Array(vertices), this.game.gl.STATIC_DRAW);
        this.game.gl.bindBuffer(this.game.gl.ARRAY_BUFFER, this.normalBuffer);
        this.game.gl.bufferData(this.game.gl.ARRAY_BUFFER, new Float32Array(normals), this.game.gl.STATIC_DRAW);
        this.game.gl.bindBuffer(this.game.gl.ARRAY_BUFFER, this.uvBuffer);
        this.game.gl.bufferData(this.game.gl.ARRAY_BUFFER, new Float32Array(uvs), this.game.gl.STATIC_DRAW);
        var triangles = new Array();
        for (var i = 0; i < this.model.triangles.length; i++)
            triangles.push(this.model.triangles[i][0], this.model.triangles[i][1], this.model.triangles[i][2]);
        this.game.gl.bindBuffer(this.game.gl.ELEMENT_ARRAY_BUFFER, this.triangleBuffer);
        this.game.gl.bufferData(this.game.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), this.game.gl.STATIC_DRAW);
        this.triangle_count = this.model.triangles.length;
    }

    make_model_transform() {//Assuming model's front bottom left is at origin
        var x_ratio = this.w / this.model.width; if (isNaN(x_ratio)) x_ratio = 1.0;
        var y_ratio = this.h / this.model.height; if (isNaN(y_ratio)) y_ratio = 1.0;
        var z_ratio = x_ratio;
        var scaler = vec3.fromValues(x_ratio, y_ratio, z_ratio);
        var translation = vec3.fromValues(this.position[0] + this.w / 2 - this.model.center[0], this.position[1] + this.h / 2 - this.model.center[1], this.game.plane_z - this.model.center[2]);
        this.model_transform = mat4.create();
        var center = this.model.center, negate_center = vec3.create();
        mat4.fromTranslation(this.model_transform, vec3.negate(negate_center, center));
        var cache_mat4 = mat4.create();
        mat4.multiply(this.model_transform, mat4.fromScaling(cache_mat4, scaler), this.model_transform);
        mat4.multiply(this.model_transform, mat4.fromTranslation(cache_mat4, center), this.model_transform);
        mat4.multiply(this.model_transform, mat4.fromTranslation(cache_mat4, translation), this.model_transform);
    }

    center_vec3() {
        var center = vec3.create();
        vec3.add(center, this.position, vec3.create(this.w / 2, this.h / 2, 0));
        return center;
    }

    attatch_texture(url) {
        this.texture_index = this.game.retrieve_texture_index_by_url(url);
        if (!this.texture_index)
            this.texture_index = this.game.load_texture(url);
    }

    translate(translation_vec3) {
        vec3.add(this.translation, this.translation, translation_vec3);
    }

    rotate(axis_vec3, rad) {//Counter-clockwise
        var rotation_transform = mat4.create();
        mat4.fromRotation(rotation_transform, rad, axis_vec3);
        vec3.transformMat4(this.xAxis, this.xAxis, rotation_transform);
        vec3.transformMat4(this.yAxis, this.yAxis, rotation_transform);
    }

    rotate_2d(rad) {//Counter-clockwise
        this.rotate(vec3.fromValues(0.0, 0.0, -1.0), rad);
    }

    scale(scaler_vec3) {
        this.scaler = scaler_vec3;
    }

    make_transform() {//Scales then rotates by center, lastly do translation.
        var zAxis = vec3.create(); vec3.normalize(zAxis, vec3.cross(zAxis, this.xAxis, this.yAxis));
        var center = this.center_vec3(), negate_center = vec3.create();
        this.transform = mat4.create(); mat4.fromTranslation(this.transform, vec3.negate(negate_center, center));
        var rotation_transform = mat4.create(), cache_mat4 = mat4.create();
        if (this.scalers)
            mat4.multiply(this.transform, mat4.fromScaling(cache_mat4, this.scaler), this.transform);
        mat4.set(rotation_transform, this.xAxis[0], this.yAxis[0], zAxis[0], 0, this.xAxis[1], this.yAxis[1], zAxis[1], 0, this.xAxis[2], this.yAxis[2], zAxis[2], 0, 0, 0, 0, 1);
        mat4.multiply(this.transform, rotation_transform, this.transform);
        mat4.multiply(this.transform, mat4.fromTranslation(cache_mat4, center), this.transform);
        mat4.multiply(this.transform, mat4.fromTranslation(cache_mat4, this.translation), this.transform);
    }

    move(move_vec2) {
        if (!this.moveVect)
            this.moveVect = vec2.clone(move_vec2);
        else
            vec2.add(this.moveVect, this.moveVect, move_vec2);
    }

    move_to(position_vec2) {
        if (!this.moveVect) this.moveVect = vec2.create();
        vec2.subtract(this.moveVect, position_vec2, vec2.fromValues(this.position[0], this.position[1]));
    }

    update() {
        if (this.moveVect) {
            var move_vec3 = vec3.fromValues(this.moveVect[0], this.moveVect[1], 0.0);
            vec3.add(this.position, this.position, move_vec3); this.moveVect = null;
            this.translate(move_vec3);
        }
    }

    draw() {
        this.make_transform();
        mat4.multiply(this.transform, this.transform, this.model_transform);
        var pvmMatrix = mat4.create();
        mat4.multiply(pvmMatrix, this.game.pvMatrix, this.transform);
        this.game.gl.uniformMatrix4fv(this.game.mMatrixULoc, false, this.transform);
        this.game.gl.uniformMatrix4fv(this.game.pvmMatrixULoc, false, pvmMatrix);
        this.game.gl.uniform3fv(this.game.ambientULoc, this.model.material_ambient);
        this.game.gl.uniform3fv(this.game.diffuseULoc, this.model.material_diffuse);
        this.game.gl.uniform3fv(this.game.specularULoc, this.model.material_specular);
        this.game.gl.uniform1f(this.game.shininessULoc, this.model.material_n);
        this.game.gl.uniform1f(this.game.alphaULoc, this.model.material_alpha);
        this.game.gl.activeTexture(this.game.gl.TEXTURE0);
        this.game.gl.bindTexture(this.game.gl.TEXTURE_2D, this.game.retrieve_texture_by_index(this.texture_index));
        this.game.gl.uniform1i(this.game.textureULoc, 0);
        this.game.gl.bindBuffer(this.game.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.game.gl.vertexAttribPointer(this.game.vPosAttribLoc, 3, this.game.gl.FLOAT, false, 0, 0);
        this.game.gl.bindBuffer(this.game.gl.ARRAY_BUFFER, this.normalBuffer);
        this.game.gl.vertexAttribPointer(this.game.vNormAttribLoc, 3, this.game.gl.FLOAT, false, 0, 0);
        this.game.gl.bindBuffer(this.game.gl.ARRAY_BUFFER, this.uvBuffer);
        this.game.gl.vertexAttribPointer(this.game.vUVAttribLoc, 2, this.game.gl.FLOAT, false, 0, 0);
        this.game.gl.bindBuffer(this.game.gl.ELEMENT_ARRAY_BUFFER, this.triangleBuffer);
        this.game.gl.drawElements(this.game.gl.TRIANGLES, 3 * this.triangle_count, this.game.gl.UNSIGNED_SHORT, 0);
    }

    destroy() { }
}

class Model {
    constructor() {
        this.vertices = new Array();
        this.triangles = new Array();
        this.material_ambient = null;
        this.material_diffuse = null;
        this.material_specular = null;
        this.material_n = null;
        this.material_alpha = null;
        this.texture_url = null;
        this.width = null;
        this.height = null;
        this.thickness = null;
        this.center = null;
    }

    determine_width_height_thickness() {
        var min_x = null, max_x = null, min_y = null, max_y = null, min_z = null, max_z = null;
        for (var i = 0; i < this.vertices.length; i++) {
            if (min_x == null || this.vertices[i].position[0] < min_x)
                min_x = this.vertices[i].position[0];
            if (max_x == null || this.vertices[i].position[0] > max_x)
                max_x = this.vertices[i].position[0];
            if (min_y == null || this.vertices[i].position[1] < min_y)
                min_y = this.vertices[i].position[1];
            if (max_y == null || this.vertices[i].position[1] > max_y)
                max_y = this.vertices[i].position[1];
            if (min_z == null || this.vertices[i].position[2] < min_z)
                min_z = this.vertices[i].position[2];
            if (max_z == null || this.vertices[i].position[2] > max_z)
                max_z = this.vertices[i].position[2];
        }
        if (min_x != null) {
            this.width = max_x - min_x;
            this.height = max_y - min_y;
            this.thickness = max_z - min_z;
            this.center = vec3.fromValues(min_x + this.width / 2, min_y + this.height / 2, min_z + this.thickness / 2);
        }
    }

    static make_procedurally(procedural_model_generation_function) {
        var model = new Model();
        procedural_model_generation_function(model);
        model.determine_width_height_thickness();
        return model;
    }

    static read_from_JSON(url) {
        var model = new Model();
        var model_JSON = Utilities.get_JSON(url);
        for (var i = 0; i < model_JSON.vertices.length; i++)
            model.vertices.push({
                'position': vec3.fromValues(model_JSON.vertices[i][0], model_JSON.vertices[i][1], model_JSON.vertices[i][2]),
                'normal': vec3.fromValues(model_JSON.normals[i][0], model_JSON.normals[i][1], model_JSON.normals[i][2]),
                'uv': vec2.fromValues(model_JSON.uvs[i][0], model_JSON.uvs[i][1])
            });
        for (var i = 0; i < model_JSON.triangles.length; i++)
            model.triangles.push([model_JSON.triangles[i][0], model_JSON.triangles[i][1], model_JSON.triangles[i][2]]);
        model.material_ambient = vec3.fromValues(model_JSON.material.ambient[0], model_JSON.material.ambient[1], model_JSON.material.ambient[2]);
        model.material_diffuse = vec3.fromValues(model_JSON.material.diffuse[0], model_JSON.material.diffuse[1], model_JSON.material.diffuse[2]);
        model.material_specular = vec3.fromValues(model_JSON.material.specular[0], model_JSON.material.specular[1], model_JSON.material.specular[2]);
        model.material_n = model_JSON.material.n;
        model.material_alpha = model_JSON.material.alpha;
        model.texture_url = model_JSON.texture;
        model.determine_width_height_thickness();
        return model;
    }

    static read_from_OBJ(url) {
        var model = new Model();
        var model_OBJ = Utilities.get_File(url).split('\n');
        var vertex_count = 0, normal_count = 0, uv_count = 0, triangle_count = 0;
        for (var i = 0; i < model_OBJ.length; i++) {
            if (model_OBJ[i] === "") {
                model_OBJ.splice(i, 1);
                i--;
                continue;
            } model_OBJ[i] = model_OBJ[i].split(' ');
            switch (model_OBJ[i][0]) {
                case "mtllib": {
                    var material_url = "";
                    for (var j = 1; j < model_OBJ[i].length; j++)
                        material_url = material_url + " " + model_OBJ[i][j];
                    var material = this.read_material_from_MTL(material_url);
                    model.material_ambient = material.ambient;
                    model.material_diffuse = material.diffuse;
                    model.material_specular = material.specular;
                    model.material_n = material.n;
                    model.material_alpha = material.alpha;
                    break;
                } case "v": {
                    model.vertices.push({
                        'position': vec3.fromValues(parseFloat(model_OBJ[i][1]), parseFloat(model_OBJ[i][2]), parseFloat(model_OBJ[i][3])),
                        'normal': vec3.create(),
                        'uv': vec2.create()
                    }); vertex_count++;
                    break;
                } case "vn": {
                    if (normal_count >= vertex_count)
                        throw "Non-standard .obj file error.";
                    vec3.set(model.vertices[normal_count].normal, parseFloat(model_OBJ[i][1]), parseFloat(model_OBJ[i][2]), parseFloat(model_OBJ[i][3]));
                    normal_count++;
                    break;
                } case "vt": {
                    if (uv_count >= vertex_count)
                        throw "Non-standard .obj file error.";
                    vec2.set(model.vertices[uv_count].uv, parseFloat(model_OBJ[i][1]), parseFloat(model_OBJ[i][2]));
                    uv_count++;
                    break;
                } case "f": {
                    for (var j = 1; j < model_OBJ[i].length; j++) {
                        model_OBJ[i][j] = model_OBJ[i][j].split('\/');
                        for (var k = 0; k < model_OBJ[i][j].length; k++)
                            model_OBJ[i][j][k] = parseInt(model_OBJ[i][j][k]);
                        if (model_OBJ[i][j][0] != model_OBJ[i][j][1])
                            model.vertices[model_OBJ[i][j][0] - 1].uv = vec2.clone(model.vertices[model_OBJ[i][j][2] - 1].uv);
                        if (model_OBJ[i][j][0] != model_OBJ[i][j][2])
                            model.vertices[model_OBJ[i][j][0] - 1].normal = vec3.clone(model.vertices[model_OBJ[i][j][2] - 1].normal);
                    }
                    for (var j = 1; j <= model_OBJ[i].length - 3; j++) {
                        model.triangles.push([model_OBJ[i][j][0] - 1, model_OBJ[i][j + 1][0] - 1, model_OBJ[i][j + 2][0] - 1]);
                        triangle_count++;
                    }
                    break;
                }
            }
        }
        model.texture_url = "";
        model.determine_width_height_thickness();
        return model;
    }

    static read_material_from_MTL(url) {
        var material_MTL = Utilities.get_File(url).split('\n');
        var material = { 'ambient': vec3.create(), 'diffuse': vec3.create(), 'specular': vec3.create(), 'n': 1, 'alpha': 1 };
        for (var i = 0; i < material_MTL.length; i++) {
            if (material_MTL[i] === "") {
                material_MTL.splice(i, 1);
                i--;
                continue;
            } material_MTL[i] = material_MTL[i].split(' ');
            switch (material_MTL[i][0]) {
                case "Ka": {
                    vec3.set(material.ambient, parseFloat(material_MTL[i][1]), parseFloat(material_MTL[i][2]), parseFloat(material_MTL[i][3]));
                    break;
                } case "Kd": {
                    vec3.set(material.diffuse, parseFloat(material_MTL[i][1]), parseFloat(material_MTL[i][2]), parseFloat(material_MTL[i][3]));
                    break;
                } case "Ks": {
                    vec3.set(material.specular, parseFloat(material_MTL[i][1]), parseFloat(material_MTL[i][2]), parseFloat(material_MTL[i][3]));
                    break;
                } case "Ni": {
                    material.n = parseFloat(material_MTL[i][1]);
                    break;
                }
            }
        }
        return material;
    }
}

//---------------------------------------------- Test Game

class Missile_Command extends Game_Base {
    constructor(framerate, plane_z) {
        super(framerate, plane_z);
        this.ground = null;
        this.missile_base_1 = null;
        this.missile_base_2 = null;
        this.missile_base_3 = null;
        this.area_of_game = null;
        this.debug = false;
    }

    load() {
        super.load();
        this.ground = new Ground();
        this.missile_base_1 = new Missile_Base(1 / 3 * 0.2, 0, 1 / 3 * 0.6, 1 / 3 * 0.6 * 0.618 / 2);
        this.missile_base_2 = new Missile_Base(1 / 3 * (1 + 0.2), 0, 1 / 3 * 0.6, 1 / 3 * 0.6 * 0.618 / 2);
        this.missile_base_3 = new Missile_Base(1 / 3 * (2 + 0.2), 0, 1 / 3 * 0.6, 1 / 3 * 0.6 * 0.618 / 2);
        this.area_of_game = new AoG();
    }

    update() {
        super.update();
        this.ground.update();
        this.missile_base_1.update();
        this.missile_base_2.update();
        this.missile_base_3.update();
        if (this.debug) this.area_of_game.update();
    }

    draw() {
        super.draw();
        this.ground.draw();
        this.missile_base_1.draw();
        this.missile_base_2.draw();
        this.missile_base_3.draw();
        if (this.debug) this.area_of_game.draw();
    }
}

class Missile_Base extends Game_Object {
    constructor(x, y, w, h) {
        super(x, y, w, h, missile_command);
    }

    load_model() {
        this.model = Model.read_from_OBJ("missile base.obj");
        this.model.texture_url = "grass-512.png";
    }
}

class Ground extends Game_Object {
    constructor() {
        const width=4;
        super(-(width-1)/2, -0.0001, width, 0, missile_command);
    }

    load_model() {
        this.model = Model.read_from_OBJ("ground.obj");
        this.model.texture_url = "grass-2048.png";
    }
}

class AoG extends Game_Object {
    constructor() {
        super(0, 0, 1, 1, missile_command);
    }

    load_model() {
        this.model = Model.make_procedurally(AoG.make_model);
    }

    static make_model(model) {
        model.vertices.push({
            'position': vec3.fromValues(0, 0, 0),
            'normal': vec3.fromValues(0, 0, -1),
            'uv': vec2.fromValues(1 - 0, 1 - 0)
        });
        model.vertices.push({
            'position': vec3.fromValues(0, 1, 0),
            'normal': vec3.fromValues(0, 0, -1),
            'uv': vec2.fromValues(1 - 0, 1 - 1)
        });
        model.vertices.push({
            'position': vec3.fromValues(1, 1, 0),
            'normal': vec3.fromValues(0, 0, -1),
            'uv': vec2.fromValues(1 - 1, 1 - 1)
        });
        model.vertices.push({
            'position': vec3.fromValues(1, 0, 0),
            'normal': vec3.fromValues(0, 0, -1),
            'uv': vec2.fromValues(1 - 1, 1 - 0)
        });
        model.triangles.push([0, 1, 2], [2, 3, 0]);
        model.material_ambient = vec3.fromValues(1, 1, 1);
        model.material_diffuse = vec3.fromValues(1, 1, 1);
        model.material_specular = vec3.fromValues(1, 1, 1);
        model.material_n = 1;
        model.material_alpha = 0.1;
        model.texture_url = "";
    }
}

//---------------------------------------------- Run

var missile_command = new Missile_Command(60, 0.5);
// missile_command.debug = true;
missile_command.start();