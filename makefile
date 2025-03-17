build:
	docker buildx build --platform linux/amd64 -t backendapi:1.0.1 --load -f Dockerfile.api .

run:
	nodemon


up:
	docker-compose up -d --build

down:
	docker-compose down

# build:
# 	docker-compose up --build