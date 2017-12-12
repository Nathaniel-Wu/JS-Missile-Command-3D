# Program 4

This is the program assignment 4, missile command in 3D.

Model and texture files are loaded via HTTP request, so you need to deploy this page on a HTTP server to play it.

It **won't** run if you simply click on index.html.

#### Browser compatibility

Safari (tested with 11.0.2), Chrome (tested with 63.0.3239.84) and Firefox (tested with 57.0.1) have no problem running it under **HTTP**.

However, CrossOrigin asset under **HTTPS** is only allowed in **Chrome** and **Firefox**, if you run the game in Safari, no texture can be loaded.

#### Extra Credit Implemented

1. Descending missile split randomly at a certain rate when they are above certain height.
2. Added missile explosion animation, and desending missile explodes all unlaunched missiles in a missile base.
3. Added periodic spaceships flying through, shoot it rewards 1000 points.
4. Track and display score, every descending missile destroyed grants 100 points.
5. When all descending missiles have been exploded or landed, the game restarts; everything is random in the game, so every restart begins a new level.