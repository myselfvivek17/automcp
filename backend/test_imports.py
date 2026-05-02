"""
Simple test to verify all imports work correctly
"""

print("Testing imports...")

try:
    print("1. Testing agent imports...")
    from app.agents import BaseAgent, CodeGeneratorAgent
    print("   ✓ Agent imports successful")
    
    print("2. Testing generation route imports...")
    from app.api.v1 import generation
    print("   ✓ Generation route imports successful")
    
    print("3. Testing API router...")
    from app.api.v1 import api_router
    print("   ✓ API router imports successful")
    
    print("4. Testing agent instantiation...")
    agent = CodeGeneratorAgent()
    print(f"   ✓ Agent created: {agent.name}")
    
    print("\n✅ All imports successful! The agent system is properly integrated.")
    print("\nNote: To run the server, install missing dependencies:")
    print("  pip install email-validator")
    
except ImportError as e:
    print(f"\n❌ Import error: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()

# Made with Bob
