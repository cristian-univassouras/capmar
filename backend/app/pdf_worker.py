"""Reconstrói somente páginas; parser isolado, com tempo/memória limitados no Linux."""
import io
import sys

if sys.platform != "win32":
    import resource
    resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024, 256 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_CPU, (5, 5))

from pypdf import PdfReader, PdfWriter

reader = PdfReader(io.BytesIO(sys.stdin.buffer.read(5 * 1024 * 1024 + 1)), strict=True)
if reader.is_encrypted or not 1 <= len(reader.pages) <= 50:
    raise ValueError("PDF protegido ou quantidade inválida de páginas")
writer = PdfWriter()
for page in reader.pages:
    writer.add_page(page, excluded_keys=["/Annots", "/AA", "/Metadata", "/AF", "/PresSteps"])
output = io.BytesIO()
writer.write(output)
sys.stdout.buffer.write(output.getvalue())
