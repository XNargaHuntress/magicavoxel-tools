# magicavoxel-tools
npm package for reading MagicaVoxel files and doing things with the data

**Note:** there is very little documentation right now...and possibly ever. I'll give it a shot as best I can...but I make no guarantees :shrug:

That said, if you're wanting to create optimized models with PBR maps, take a look in the cli.js. If you don't care about texel size or padding, you can run cli.js with `npm run convert -- [input.vox] [output.obj]`

What I have implemented is reading the MagicaVoxel format and pulling out the voxel models, the palette, the materials and the scene graph. I don't do ~~anything~~ much with it, but if you have any ideas, go for it :D

Hopefully someone finds this useful :shrug:
