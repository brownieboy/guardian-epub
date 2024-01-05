# guardian-epub

Need to read the latest edition of the Guardian newspaper on your Kindle? This is the app for you.

A Node application that will create an ePub book from the current edition of the Guardian, as created from the [Guardian's Open Platform](https://open-platform.theguardian.com/).

## Pre-requisites

To run this app, you will need:

1. [NodeJS](https://nodejs.org/) installed on your PC. Node is available for Windows, Macintosh and Linux. You should install version 18 or higher.
2. A Guardian API key. You will need to register for this at https://open-platform.theguardian.com/access/. They are free for non-commercial use.
3. A Kindle or some other kind of ePub reader.

## Installing the Package

guardian-epub is command line interface (CLI) application. It must be run from a terminal, such as:

- Windows: Git Bash or Powershell
- Macintosh: Terminal or iTerm
- Linux: various, check your distro's documentation

To install the app, the command is:

```bash
npm install -g guardian-epub
```

Note: you also use `npx` to avoid installing the package as a separate step. See **NPX Method** section below.

## Running the Package

After installation, the command to begin the creation of the Guardian ePub file is:

```bash
guardianEpub
```

just on its own.

### NPX Method

To use `npx` and avoid installing the package as a separate step, the syntax is like this:

```bash
npx -p guardian-epub@latest -y guardianEpub
```


### Enter API Key

The first time that you run the package, it will prompt you to type/paste in your Guardian API key.

After that, the key will be stored in a config file and you will not need to enter it again.

### Select your sections

The script will then present you with all the sections that are available. Pick the ones that you want to be in your ePub, using the on-screen command keys. All articles from your selected sections will be downloaded.

Hit the Return/Enter key when you're done.

### Re-order you sections (optional)

By default, your sections will appear in the your ePub alphabetically, which is probably not what you want. So the script will ask you to put them in order, using the on-screen keys again.

Again, hit the Return/Enter key when you're done.

Your chosen order will stored in a different config file, and that order will be used the basis for all future section selections.

### Skipping sections selection

If you want to retrieve the same sections in the same order each time, then you can use the `--noselect` switch to skip out those user input selections. The syntax for that is:

```bash
guardianEpub --noselect
```

Or if you're using the `npx` syntax, then it's this:

```bash
npx -p guardian-epub@latest -y guardianEpub --noselect
```

Hint: don't use the `--noselect` the _first_ time you ever run the command, otherwise you'll end up with one empty ePub!

### Demo

The animated GIF below shows the process of creating the ePub, and then opening it and reading it in the Calibre eReader.

![Guardian ePub in action](./capture-guardian-epub.gif)

I've edited this animation to cut out the dull bits, such as the waiting for the API calls to complete. It's slower than this in real life, especially if you select a lot of sections.

I've also skipped the part where you have to enter API key, as you'll likely only ever do that once.

## Troubleshooting

### Changing your API Key

If you need to re-enter your Guardian key, you can run the command:

```bash
guardianEpubKey
```

The package will prompt you to enter your key again.

Alternatively, you can enter the config file directly. The file path to the config file is:

~/.guardianEpub/guardian-open-platform-key.json

Where "~" is your home folder, which will be different depending on your Operating System, but should be based around your user name.

As per its extension, the file is a JSON file, and should look like this:

```json
{
  "API_KEY": "put_your_key_here"
}
```

Add or change your Guardian API Platform key where it says "put_your_key_here".

## Changelog

For more information on what has changed recently, see the [CHANGELOG](CHANGELOG.md).

## Disclaimer

This NPM package, guardian-epub, is an independent project and is not affiliated with, officially maintained, authorized, endorsed, or sponsored by Guardian News and Media Limited or any of its affiliates or subsidiaries. This package is provided "as is", without warranty of any kind, express or implied.

The use of The Guardian's trademarks, brand names, or logos in this package is for identification and reference purposes only and does not imply any association with the trademark holder.

Any trademarks and brand names mentioned in this document or in the guardian-epub package are the property of their respective owners.
