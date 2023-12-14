# Guardian ePub

A Node application that will create an ePub book from the current edition of the Guardian, as created from the [Guardian's Open Platform](https://open-platform.theguardian.com/).  Designed to read the Guardian one the beach on my Kindle!


## Pre-requisites

To run this app, you will need:

1. [NodeJS](https://nodejs.org/) installed on your PC.  Node is availabe for Windows, Macintosh and Linux.  You should install version 18 or higher.
2. A Guardian API key.  You will need to register for this at https://open-platform.theguardian.com/access/.  They are free for non-commerial use.

Create a new file in the root folder, and call it guardian-open-platform-key.json.   It should like this:

```json
{
  "API_KEY": "put your key here"
}
```

Add your Guardian API Platform key where it says "put your key here"
