# guardian-epub

Need to read the latest edition of the Guardian newspaper on your Kindle? This is the app for you.

Guardian ePub is now Electron-based GUI app for Windows, Mac, and Linux. It creates an ePub book from the current edition of the Guardian using the [Guardian's Open Platform](https://open-platform.theguardian.com/).

## Pre-requisites

To run this app, you will need:

1. [NodeJS](https://nodejs.org/) installed on your PC. Node is available for Windows, Macintosh and Linux. You should install version 18 or higher. Alternatively, as of version 1.2.0, you can use the standalone installers for Windows, Mac (ARM only) and Linux. You can find these on the Git page for this project.
2. A Guardian API key. You will need to register for this at [Guardian Open Platform access](https://open-platform.theguardian.com/access/). They are free for non-commercial use.
3. A Kindle or some other kind of ePub reader.

## Installing the App

Download the latest GUI build for your OS from the Releases page and install it.

## Running the App

1. Launch **Guardian ePub**.
2. Use **Tools → API Key** to enter your Guardian API key.
3. Use **Tools → Refresh Sections** to fetch available sections.
4. Select and order your sections.
5. Generate the ePub.

Your GUI settings are stored in the app's user data directory.

### Demo

The animated GIF below shows the process of creating the ePub, and then opening it and reading it in the Calibre eReader.

![Guardian ePub in action](./capture-guardian-epub.gif)

I've edited this animation to cut out the dull bits, such as the waiting for the API calls to complete. It's slower than this in real life, especially if you select a lot of sections.

I've also skipped the part where you have to enter API key, as you'll likely only ever do that once.

## Developing The App

For development setup, architecture notes, and build details, see the developer guide:

[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)

## Changelog

For more information on what has changed recently, see the [CHANGELOG](CHANGELOG.md).

## Disclaimer

This NPM package, guardian-epub, is an independent project and is not affiliated with, officially maintained, authorized, endorsed, or sponsored by Guardian News and Media Limited or any of its affiliates or subsidiaries. This package is provided "as is", without warranty of any kind, express or implied.

The use of The Guardian's trademarks, brand names, or logos in this package is for identification and reference purposes only and does not imply any association with the trademark holder.

Any trademarks and brand names mentioned in this document or in the guardian-epub package are the property of their respective owners.
