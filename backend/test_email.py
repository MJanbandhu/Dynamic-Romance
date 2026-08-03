import resend
from dotenv import load_dotenv
import os

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")

response = resend.Emails.send({
    "from": "onboarding@resend.dev",
    "to": ["mojanbandhu@gmail.com"],
    "subject": "Testing",
    "html": "<h1>Hello MJ</h1>"
})

print(response)