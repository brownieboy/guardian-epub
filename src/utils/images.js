import Jimp from "jimp";

export async function createTextImage(outputPath, titleText, timeText) {
  const width = 1200; // Width of the cover
  const height = 1600; // Height of the cover
  const backgroundColor = 0xffffffff; // White background (in ARGB format)
  const padding = 20; // Padding between title and time text

  try {
    // Create a new image
    const image = new Jimp(width, height, backgroundColor);

    // Load fonts
    const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_128_BLACK); // Larger font for title
    const fontTime = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK); // Smaller font for time

    // Measure title text
    const titleTextWidth = Jimp.measureText(fontTitle, titleText);
    const titleTextHeight = Jimp.measureTextHeight(fontTitle, titleText, width);

    // Position title text in the center
    const titleX = (width - titleTextWidth) / 2;
    const titleY = (height - titleTextHeight) / 2 - padding; // Adjust y position for title

    // Add title text to image
    image.print(fontTitle, titleX, titleY, titleText);

    // Measure time text
    const timeTextWidth = Jimp.measureText(fontTime, timeText);

    // Position time text below title text
    const timeX = (width - timeTextWidth) / 2;
    const timeY = titleY + titleTextHeight + padding;

    // Add time text to image
    image.print(fontTime, timeX, timeY, timeText);

    // Save the image
    await image.writeAsync(outputPath);

    console.log("Image created:", outputPath);
  } catch (error) {
    console.error("Error creating image:", error);
  }
}
