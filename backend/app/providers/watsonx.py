import requests
from typing import Optional
from app.providers.base import BaseAIProvider


class WatsonxProvider(BaseAIProvider):
    """Simple Watsonx AI provider"""
    
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        super().__init__(api_key, **kwargs)
        self.base_url = kwargs.get('base_url', 'https://us-south.ml.cloud.ibm.com')
        self.project_id = kwargs.get('project_id')
    
    def generate(self, prompt: str, **kwargs) -> str:
        """Generate text from prompt"""
        if not self.api_key:
            return f"Mock response for: {prompt[:50]}..."
        
        try:
            url = f"{self.base_url}/ml/v1/text/generation"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            data = {
                "input": prompt,
                "model_id": kwargs.get('model_id', 'ibm/granite-13b-chat-v2'),
                "project_id": self.project_id,
                "parameters": {
                    "max_new_tokens": kwargs.get('max_tokens', 200),
                    "temperature": kwargs.get('temperature', 0.7)
                }
            }
            
            response = requests.post(url, json=data, headers=headers, timeout=30)
            response.raise_for_status()
            result = response.json()
            return result.get('results', [{}])[0].get('generated_text', '')
        except Exception as e:
            return f"Error: {str(e)}"

# Made with Bob
