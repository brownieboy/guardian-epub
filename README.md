# guardian-epub

Need to read the latest edition of the Guardian newspaper on your Kindle? This is the app for you.

Guardian ePub is now Electron-based GUI app for Windows, Mac, and Linux. It creates an ePub book from the current edition of the Guardian using the [Guardian's Open Platform](https://open-platform.theguardian.com/).

## Pre-requisites

To run this app, you will need:

1. A Guardian API key. You will need to register for this at [Guardian Open Platform access](https://open-platform.theguardian.com/access/). They are free for non-commercial use.
1. A PC running Windows or Linux, or an ARM-based Macintosh to create the epub file.
1. A Kindle or some other kind of ePub reader.

## Installing the App

Download the latest GUI build for your OS from the Releases page and install it.

## Running the App

1. Launch **Guardian ePub**.
2. Use **Tools → API Key** to enter your Guardian API key.
3. The app will fetch a list of sections from the Guardian servers when you first enter your API key.  You can use **Tools → Refresh Sections** to fetch available sections when the Guardian changes them (which doesn't seem to be that often).
4. Select (tick) the checkboxes for the sections that you want
5. Reorder your selected sections via drag and drop
6. Generate the ePub.

Your GUI settings are stored in the app's user data directory.

### Demo

The animated GIF below shows the process of creating the ePub, and then opening it and reading it in the Calibre eReader.

![Guardian ePub in action](./capture-guardian-epub.gif)

I've edited this animation to cut out the dull bits, such as the waiting for the API calls to complete. It's slower than this in real life, especially if you select a lot of sections.

I've also skipped the part where you have to enter API key, as you'll likely only ever do that once (and I don't want you see *my* key!).

## Developing The App

For development setup, architecture notes, and build details, see the developer guide:

[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)

## Changelog

For more information on what has changed recently, see the [CHANGELOG](CHANGELOG.md).

## Disclaimer

This application, guardian-epub, is an independent project and is not affiliated with, officially maintained, authorised, endorsed, or sponsored by Guardian News and Media Limited or any of its affiliates or subsidiaries. This package is provided "as is", without warranty of any kind, express or implied.

Any use of The Guardian's trademarks, brand names, or logos in this package is for identification and reference purposes only and does not imply any association with the trademark holder.

Any trademarks and brand names mentioned in this document or in the guardian-epub package are the property of their respective owners.
