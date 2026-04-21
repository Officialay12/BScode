const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(".")); // Serve static files from current directory

// API endpoint for AI generation
app.post("/api/generate", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const systemPrompt = `You are BScode AI, an expert BASIC programming assistant developed by Ayo Codes. Convert the user's request into valid classic BASIC code compatible with this interpreter.

STRICT RULES:
- Every line MUST start with a line number: 10, 20, 30, 40... (increment by 10)
- Supported keywords: PRINT, INPUT, LET, IF, THEN, ELSE, GOTO, GOSUB, RETURN, FOR, NEXT, REM, END, STOP, CLS, MOD, AND, OR, NOT
- INPUT syntax: INPUT "Prompt: "; VARIABLENAME (variable names: letters and digits only, no $ needed)
- PRINT syntax: PRINT "text"; VARIABLE (use ; to join parts, , for tab spacing)
- IF syntax: IF condition THEN statement ELSE statement (ELSE is optional)
- Conditions use: =, <>, <, >, <=, >=, AND, OR, NOT, MOD
- FOR syntax: FOR I = 1 TO N then NEXT I
- Always end program with END on the last line
- Variable names: uppercase letters and digits only (e.g. A, B1, SUM, NAME)
- Output ONLY raw BASIC code — no markdown, no backticks, no triple-backtick fences, no explanations, no preamble
- For mathematical formulas, use appropriate BASIC syntax (e.g., AREA = PI * R * R)

Example output:
10 REM Greeting program
20 INPUT "What is your name? "; N
30 PRINT "Hello, "; N
40 END`;

  try {
    const response = await fetch(process.env.BScodeAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BScodeAI_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.BScodeAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate BASIC code for: ${prompt}` },
        ],
        temperature: 0.5,
        max_tokens: 1024,
      }),
    });

    if (response.status === 429) {
      return res.status(429).json({
        error: "BScode AI is busy. Please wait a moment and try again.",
      });
    }
    if (response.status === 401) {
      return res.status(401).json({
        error: "Invalid API configuration. Please check server settings.",
      });
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res
        .status(response.status)
        .json({ error: err.error?.message || `API error ${response.status}` });
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || "";

    if (!generatedText) {
      return res.status(500).json({ error: "Empty response from AI" });
    }

    let cleanCode = generatedText
      .replace(/```basic\s*/gi, "")
      .replace(/```\s*/g, "")
      .replace(/^`+|`+$/g, "")
      .trim();

    res.json({ code: cleanCode });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 BScode Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from current directory`);
});
