#!/bin/bash
# Compile a LaTeX resume using the Docker latex container
# Usage: ./compile_resume.sh <RESUME_CODE>
#   e.g. ./compile_resume.sh DSVNYC202603102105

set -e

CODE="$1"

if [ -z "$CODE" ]; then
  echo "Usage: $0 <RESUME_CODE>"
  echo "  Compiles latex/generated/<CODE>.tex → latex/generated/<CODE>.pdf"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

TEX_FILE="generated/${CODE}.tex"

# Check if the .tex file exists inside the latex/ mount
if [ ! -f "latex/${TEX_FILE}" ]; then
  echo "Error: latex/${TEX_FILE} not found"
  exit 1
fi

echo "→ Compiling ${TEX_FILE}..."

# Run pdflatex twice (for references/TOC)
docker exec latex sh -c "cd /data && pdflatex -output-directory=generated ${TEX_FILE} && pdflatex -output-directory=generated ${TEX_FILE}"

# Verify output
if [ -f "latex/generated/${CODE}.pdf" ]; then
  echo "✓ PDF generated: latex/generated/${CODE}.pdf"
  
  # Clean up auxiliary files
  docker exec latex sh -c "cd /data/generated && rm -f ${CODE}.aux ${CODE}.log ${CODE}.out 2>/dev/null || true"
  
  echo "✓ Cleaned auxiliary files"
else
  echo "✗ PDF generation failed"
  exit 1
fi
