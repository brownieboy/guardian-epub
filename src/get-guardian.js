import axios from "axios";
import Epub from "epub-gen";
import { readFileSync } from "fs";

// Load API key from a JSON file
function loadApiKey() {
  try {
    const jsonData = readFileSync("guardian-open-platform-key.json");
    return JSON.parse(jsonData).API_KEY;
  } catch (error) {
    console.error("Error reading API key from file:", error);
    process.exit(1); // Exit the script in case of an error
  }
}

const API_KEY = loadApiKey();

// Function to fetch articles
async function fetchArticles() {
  try {
    const response = await axios.get(
      "https://content.guardianapis.com/search",
      {
        params: {
          "api-key": API_KEY,
          "show-fields": "all", // Adjust the fields as per your requirement
        },
      },
    );
    return response.data.response.results;
  } catch (error) {
    console.error("Error fetching articles:", error);
    return [];
  }
}

// Function to convert articles to EPUB format
async function createEpub(articles) {
  const options = {
    title: "The Guardian Content",
    author: "The Guardian",
    content: articles.map(article => {
      return {
        title: article.webTitle,
        data: article.fields.body, // Assuming 'body' contains the HTML content
      };
    }),
  };

  try {
    await new Epub(options, "guardian.epub").promise;
    console.log("EPUB file created successfully.");
  } catch (error) {
    console.error("Error creating EPUB file:", error);
  }
}

// Main function to run the script
async function main() {
  const articles = await fetchArticles();
  if (articles.length > 0) {
    await createEpub(articles);
  } else {
    console.log("No articles found to create EPUB.");
  }
}

main();
