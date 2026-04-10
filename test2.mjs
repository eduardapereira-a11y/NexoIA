import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyCzMllXYc7FNMkpqjbKpDIs9a85hGiZnvw");

async function list() {
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-3.5-flash'];
  
  for (const t of models) {
     try {
       const model = genAI.getGenerativeModel({ model: t });
       await model.generateContent("test");
       console.log(t, "WORKS");
     } catch(e) {
       console.log(t, "FAILS: " + e.message.split('\n')[0]);
     }
  }
}
list();
