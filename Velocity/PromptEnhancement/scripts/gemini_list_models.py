from google.generativeai import configure, list_models
import os

# Try to get the API key from environment variable or prompt the user
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not api_key:
    api_key = input("Enter your Gemini API key: ")

configure(api_key=api_key)

print("Available Gemini models for your key:")
for model in list_models():
    print(model.name) 