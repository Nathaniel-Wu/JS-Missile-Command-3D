# JS Missile Command 3D

[This](https://nathaniel-wu.github.io/JS-Missile-Command-3D) is a remake of classic Atari Missile Command in 3D.

Model and texture files are loaded via HTTP request, so you need to deploy this page on a HTTP server to play it.

It **won't** run if you simply click on index.html.

#### Browser compatibility

Safari (tested with 11.0.2), Chrome (tested with 63.0.3239.84) and Firefox (tested with 57.0.1) have no problem running it under **HTTP**.

However, CrossOrigin asset under **HTTPS** is only allowed in **Chrome** and **Firefox**, if you run the game in Safari, no texture can be loaded.