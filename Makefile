APP_NAME=cuddlecad

setup:
	docker compose build

run:
	docker compose up --build

start:
	docker compose up -d --build

stop:
	docker compose down

restart: stop setup start

logs:
	docker compose logs -f

zip:
	mkdir -p dist
	zip -r dist/cad-cuddle-builder.zip . -x "dist/*" "__pycache__/*" "*.pyc" ".git/*"
