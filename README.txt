CLANK CORNER - how to put it online for free (no coding needed)

OPTION A: Netlify Drop (easiest, about 2 minutes)
1. Unzip clank-corner.zip on your computer. You will get a folder called "clank-corner".
2. Go to https://app.netlify.com/drop in your web browser.
3. Drag the whole "clank-corner" folder (not the zip file) onto the page.
   (A free Netlify account may be asked for so the site stays online. It is free.)
4. Netlify gives you a web address. Open it on your phone and computer to check!
5. Optional: in Site settings, choose "Change site name" to pick a nicer address.

OPTION B: GitHub Pages
1. Make a free account at github.com and create a new public repository.
2. Click "Add file" > "Upload files" and drag in everything INSIDE the clank-corner folder.
3. Go to Settings > Pages, set Source to "Deploy from a branch", branch "main", folder "/ (root)", and Save.
4. After a minute your site appears at https://YOURNAME.github.io/REPOSITORY/

ADDING REAL PHOTOS LATER
1. Put your photo (for example knee-sock.jpg) in the "assets" folder.
2. In index.html find the matching accessory card. Replace the whole <svg ...> ... </svg>
   inside <figure class="photo"> with:  <img src="assets/knee-sock.jpg" alt="Crochet knee sock">
3. Upload the changed files again.

FILES
index.html = the page, style.css = the look, script.js = the builder and buttons.
No accounts, API keys, databases or paid services are used.
