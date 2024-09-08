// src/utils/cleanJson.ts
export function cleanJson(jsonString: string): string {

    // 1. Remove markdown-like code block indicators 
    // These are sometimes added by AI models, especially if you've asked for JSON output within a larger text response
    jsonString = jsonString.replace(/`json\n?/g, '').replace(/`\n?/g, ''); 

    // 2. Remove any trailing commas inside objects or arrays
    // This is a common issue in AI-generated JSON, where extra commas might be added at the end of lists
    jsonString = jsonString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'); 

    // 3. Handle unterminated strings
    // Sometimes, the AI might not properly close a string with a quotation mark. This tries to fix that.
    jsonString = jsonString.replace(/([^\\])(")([^"]*$)/g, '$1$2$3"'); 

    // 4. Find the last occurrence of a closing brace '}'
    // This is to handle cases where the AI adds extra text or data AFTER the valid JSON
    const lastBraceIndex = jsonString.lastIndexOf('}');

    // 5. If a closing brace is found, extract the substring up to that point
    if (lastBraceIndex !== -1) {
        jsonString = jsonString.substring(0, lastBraceIndex + 1); 
    } else {
        // 6. Handle the case where no closing brace is found
        // This could indicate a severely malformed response. You can choose to:
        //    * Return an empty JSON object to avoid crashing
        //    * Throw an error to explicitly handle this case in your API route
        console.error('No closing brace found in AI response. Returning empty JSON.');
        return '{}'; 
    }

    // 7. Trim any leading/trailing whitespace 
    return jsonString.trim();
}