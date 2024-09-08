"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Function to clean and handle potential JSON parsing issues
const cleanJson = (jsonString: string): string => {
  // Remove markdown-like code block indicators
  jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  // Remove trailing commas inside objects or arrays
  jsonString = jsonString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  return jsonString.trim();
};

const GeminiTest = () => {
  const [inputValue, setInputValue] = useState<string>("");
  const [response, setResponse] = useState<string>("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testRoute = async (route: string, body: any) => {
    console.group(`Testing Route: ${route}`);
    console.time("API Call Duration");

    try {
      console.log("Request Body:", body);

      const res = await fetch(route, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      console.log("Status Code:", res.status);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API call failed with status ${res.status}: ${errorText}`);
      }

      let rawResponse = await res.text();
      console.log("Raw Response Data:", rawResponse);

      // Clean and parse the response
      rawResponse = cleanJson(rawResponse);
      const data = JSON.parse(rawResponse);

      // Display the JSON response in the textbox
      setResponse(JSON.stringify(data, null, 2));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error occurred during API call:", error);
      setResponse(`Error: ${error.message}`);
    } finally {
      console.timeEnd("API Call Duration");
      console.groupEnd();
    }
  };

  const handleTest = async () => {
    switch (inputValue.toLowerCase()) {
      case "initialize":
        await testRoute("/api/game-master/initialize", {});  // Calling the API with an empty body
        break;
      default:
        setResponse("Unknown command");
    }
  };

  return (
    <Card className="max-w-lg mx-auto mt-6">
      <CardHeader>
        <CardTitle>Gemini Route Tester</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); handleTest(); }} className="flex gap-2">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter a route command (e.g., initialize)"
            className="flex-1"
            required
          />
          <Button type="submit">Test Route</Button>
        </form>
        <pre className="border p-4 h-64 overflow-auto bg-gray-100">
          {response}
        </pre>
      </CardContent>
    </Card>
  );
};

export default GeminiTest;