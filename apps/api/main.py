from fastapi import FastAPI

app = FastAPI(title='Placement AI API')

@app.get('/')
def root():
    return {'message': 'Placement AI API is running'}
