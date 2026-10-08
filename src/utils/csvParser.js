// src/utils/csvParser.js
import Papa from 'papaparse';

export async function loadSyntheaCsv(filePath) {
  try {
    const url = filePath.startsWith('http') || filePath.startsWith('blob:')
      ? filePath
      : new URL(filePath, import.meta.url).href;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err)
      });
    });
  } catch (error) {
    console.error('Error loading CSV file:', error);
    return [];
  }
}