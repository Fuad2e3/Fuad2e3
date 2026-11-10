# Journey assets

| File | What it is |
| :--- | :--- |
| `me.jpg` | Face photo used on the stylised 3D hero (front-facing, face centred). |
| `me.glb` | **Optional.** A realistic rigged 3D avatar of you. If this file exists, the site uses it instead of the stylised hero. |

## Making `me.glb` (a realistic avatar with your face)

1. **Avatar from your photos.** Create a full-body avatar from a selfie or front photo with an avatar generator that exports a rigged **GLB** (for example Avaturn). Use a well-lit, front-facing photo.
2. **Animations.** Upload the avatar (FBX) to [Mixamo](https://www.mixamo.com) and download these animations, each with the **"In Place"** box ticked:
   - `Walking`: rename the clip to **Walk**
   - `Breathing Idle`: rename to **Idle**
   - `Waving`: rename to **Wave**
3. **Combine.** In Blender: import the avatar and the three animations, put the actions on the one armature (NLA editor → push down), then *File → Export → glTF 2.0 (.glb)* with *Animation* enabled. Keep the file under about 20 MB (*Compression* on).
4. **Drop it in.** Save it as `journey/assets/me.glb` and push. The site picks it up automatically:
   - **Walk** is driven by the scroll (forward and backward)
   - **Idle** plays when the visitor stops scrolling
   - **Wave** plays at the start and the end

Clip names only need to *contain* walk / idle / wave (any case). Horizontal root motion in a non-"In Place" walk is removed automatically.
