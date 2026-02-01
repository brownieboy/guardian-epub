import Jimp from "jimp";

const COVER_WIDTH = 1200;
const COVER_HEIGHT = 1600;

export async function createTextImage(outputPath, titleText, timeText) {
  const backgroundColor = 0xffffffff; // White background (in ARGB format)
  const padding = 20; // Padding between title and time text

  try {
    const image = new Jimp(COVER_WIDTH, COVER_HEIGHT, backgroundColor);

    const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_128_BLACK);
    const fontTime = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);

    const titleTextWidth = Jimp.measureText(fontTitle, titleText);
    const titleTextHeight = Jimp.measureTextHeight(
      fontTitle,
      titleText,
      COVER_WIDTH,
    );

    const titleX = (COVER_WIDTH - titleTextWidth) / 2;
    const titleY = (COVER_HEIGHT - titleTextHeight) / 2 - padding;

    image.print(fontTitle, titleX, titleY, titleText);

    const timeTextWidth = Jimp.measureText(fontTime, timeText);
    const timeX = (COVER_WIDTH - timeTextWidth) / 2;
    const timeY = titleY + titleTextHeight + padding;

    image.print(fontTime, timeX, timeY, timeText);

    await image.writeAsync(outputPath);

    console.log("Image created:", outputPath);
  } catch (error) {
    console.error("Error creating image:", error);
  }
}

export async function createCoverImage(
  outputPath,
  titleText,
  timeText,
  imageUrl,
  captionText,
) {
  if (!imageUrl) {
    await createTextImage(outputPath, titleText, timeText);
    return;
  }

  try {
    const image = await Jimp.read(imageUrl);
    image.cover(COVER_WIDTH, COVER_HEIGHT);

    const overlayHeight = captionText ? 320 : 260;
    const overlay = new Jimp(COVER_WIDTH, overlayHeight, 0x00000080);
    image.composite(overlay, 0, COVER_HEIGHT - overlayHeight);

    const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
    const fontTime = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    const fontCaption = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

    image.print(
      fontTitle,
      40,
      COVER_HEIGHT - overlayHeight + 30,
      titleText,
      COVER_WIDTH - 80,
    );
    image.print(
      fontTime,
      40,
      COVER_HEIGHT - overlayHeight + 120,
      timeText,
      COVER_WIDTH - 80,
    );
    if (captionText) {
      image.print(
        fontCaption,
        40,
        COVER_HEIGHT - overlayHeight + 190,
        captionText,
        COVER_WIDTH - 80,
      );
    }

    await image.writeAsync(outputPath);

    console.log("Image created:", outputPath);
  } catch (error) {
    console.error("Error creating image from URL:", error);
    await createTextImage(outputPath, titleText, timeText);
  }
}
