import { Plugin, MarkdownView, MarkdownPostProcessorContext, getLinkpath, TFile, normalizePath } from 'obsidian';

export default class ImageComparisonSliderPlugin extends Plugin {
  private filePathCache: Map<string, string> = new Map();
  private markdownCache: Map<string, string> = new Map();

  // Entry Point
  async onload() {
    //console.log("Image Comparison Slider plugin loaded!");

    this.registerMarkdownCodeBlockProcessor("img-compare", (source, el, ctx) => { // ❗ Parse Code Block
      this.createMediaSlider(source, el, ctx);
    });
    
  }

  private createMediaSlider(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		const metadataMatch = source.match(/---\n([\s\S]+?)\n---/);
		const mediaContent = source.replace(/---\n[\s\S]+?\n---/, "").trim(); // Reads for ![[picture.png]] files
		const mediaFiles = mediaContent.split("\n").map(line => line.trim()).filter(Boolean);

    const validFiles = mediaFiles.map(file => {
			let match = file.match(/!?\[\[(.*?)\]\]/);
			if (!match) {
				match = file.match(/!\[\]\((.*?)\)/);
			}
			return match ? match[1] : "";
		}).filter(Boolean);

    //console.log("Valid Files: " + validFiles);
    //console.log(validFiles.length);

    const imageWrapper = el.createDiv("image-wrapper");


    // Automatically select first image and second image
    if (validFiles.length === 0) return;

    if (validFiles.length < 2) {
      const img = imageWrapper.createEl("img", { attr: {src: this.getMediaSource(validFiles[0]) }, cls: "bottom"}); // src: filepath
      return;
    }

    // Get Obsidain local file paths
    //const filepath = this.getMediaSource('placeholder1.jpg'); // 'templar_knight.png' , 'placeholder1.jpg', etc.
    //const filepath2 = this.getMediaSource('placeholder2.jpg');
    // console.log("Final URL: " + filepath);


    // Element to render images into
    const img_before = imageWrapper.createEl("img", { attr: {src: this.getMediaSource(validFiles[0]) }, cls: "bottom"}); // src: filepath
    const img_after = imageWrapper.createEl("img", {attr: {src: this.getMediaSource(validFiles[1])}, cls: "top"});
    const slider = imageWrapper.createEl("div", {cls: "slider"});

    // Create Elements for buttons, if more than 2 images loaded.
    if (validFiles.length > 2) {
      const buttonWrapper = el.createDiv("button-wrapper");
      const btn_before = buttonWrapper.createEl("select", {cls: "button-left"});
      const btn_after = buttonWrapper.createEl("select", {cls: "button-right"});

      btn_before.addEventListener("change", (evt: Event) => {
        const selectedValue = (evt.target as HTMLSelectElement).value;
        img_after.src=this.getMediaSource(selectedValue);
        //console.log("Selected Value: ", selectedValue);
      })
      btn_after.addEventListener("change", (evt: Event) => {
        const selectedValue = (evt.target as HTMLSelectElement).value;
        img_before.src=this.getMediaSource(selectedValue);
        //console.log("Selected Value: ", selectedValue);
      })

      validFiles.forEach(file => {
        const newOption = buttonWrapper.createEl('option');
        newOption.value = file;
        newOption.text = file;
        btn_before.appendChild(newOption);
        btn_before.selectedIndex = 1;
      })
      validFiles.forEach(file => {
        const newOption = buttonWrapper.createEl('option');
        newOption.value = file;
        newOption.text = file;
        btn_after.appendChild(newOption);
      })       
    }

    //img.classList.add("slider-media");
    // const img = mediaWrapper.createEl("img", { attr: { src: filepath } });

    let isDragging = false;
    let touchStartX = 0;
    imageWrapper.addEventListener("mousedown", (evt: MouseEvent) => {
      evt.preventDefault();
      console.log("Mouse down");
      // Get the mouse position relative to the element
      isDragging = true;
      const pos = 100-((evt.offsetX / imageWrapper.offsetWidth) * 100);
      console.log(pos);
      img_after.style.maskImage = 'linear-gradient(to left, transparent, transparent ' + pos + '%, black ' + pos + '%, black)';
      img_after.style.webkitMaskImage = 'linear-gradient(to left, transparent, transparent '+pos+'%, black ' +pos+'%, black)';
      slider.style.right = pos+'%';
    });
    imageWrapper.addEventListener("mouseup", (evt: MouseEvent) => {
      evt.preventDefault();
      console.log("Mouse Up");
      isDragging = false;
    });
    imageWrapper.addEventListener("mousemove", (evt: MouseEvent) => {
      if (isDragging) {
        // Move the slider and offset the images

        // position the slider
        const pos = 100-((evt.offsetX / imageWrapper.offsetWidth) * 100);
        console.log(pos);
        img_after.style.maskImage = 'linear-gradient(to left, transparent, transparent ' + pos + '%, black ' + pos + '%, black)';
        img_after.style.webkitMaskImage = 'linear-gradient(to left, transparent, transparent '+pos+'%, black ' +pos+'%, black)';
        slider.style.right = pos+'%';
      }
    });
    imageWrapper.addEventListener("mouseleave", (evt: MouseEvent) => {
      isDragging = false;
    });
    imageWrapper.addEventListener("touchstart", (evt: TouchEvent) => {
      evt.preventDefault();
    });
    imageWrapper.addEventListener("touchend", (evt: TouchEvent) => {
      evt.preventDefault();
    });
  }

  onunload() {
    console.log("Image Comparison Slider plugin unloaded!");
  }

  // --- Resource Helpers ---
  private getCachedResourcePath(fileName: string): string {
    if (this.filePathCache.has(fileName)) {
      return this.filePathCache.get(fileName)!;
    }
    const path = this.app.vault.adapter.getResourcePath(fileName);
    this.filePathCache.set(fileName, path);
    return path;
  }

  /**
 * Get a file or folder inside the vault at the given path. To check if the return type is
 * a file, use `instanceof TFile`. To check if it is a folder, use `instanceof TFolder`.
 * @param filename - placeholder1.jpg
 * @returns 
 */
  private getMediaSource(fileName: string): string {
    if (fileName.startsWith("http://") || fileName.startsWith("https://")) {
      return fileName;
    }
    let file = this.app.vault.getAbstractFileByPath(fileName);
    if (!file) {
      const matchingFiles = this.app.vault.getFiles().filter(
        f => f.name.toLowerCase() === fileName.toLowerCase()
      );
      if (matchingFiles.length > 0) {
        fileName = matchingFiles[0].path;
      } else {
        console.error("File not found in vault:", fileName);
      }
    }
    return this.getCachedResourcePath(fileName);
  }
}