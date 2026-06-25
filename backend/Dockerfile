FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies + uv
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && curl -LsSf https://astral.sh/uv/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

# Add uv to PATH
ENV PATH="/root/.local/bin:$PATH"

# Copy dependency and lock files
COPY pyproject.toml uv.lock .python-version ./

# Install Python dependencies with uv (no editable install needed for app)
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Expose application port
EXPOSE 8000

# Start the application using uv run
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
