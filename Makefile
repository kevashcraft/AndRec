default: dev

build_bash:
	docker-compose -p andrec_dev build bash

bash: build_bash
	docker-compose -p andrec_dev run bash bash

build_dev:
	docker-compose -p andrec_dev build andrec

dev: down build_dev
	docker-compose -p andrec_dev up andrec

down:
	docker-compose -p andrec_dev down -v

cordova_build:
	docker build -t andrec_cordova -f Dockerfile.cordova .

cordova_bash:
	docker run \
            -it \
            -v $(shell pwd)/dist:/dist \
            -v $(shell pwd)/secret:/secret \
            -v $(shell pwd)/config.xml:/cordova/andrec-kevapps/config.xml \
            -e "keystore_pass=$(keystore_pass)" \
			andrec_cordova bash

cordova: cordova_build
	docker run \
            -it \
            -v $(shell pwd)/dist:/dist \
            -v $(shell pwd)/secret:/secret \
            -v $(shell pwd)/config.xml:/cordova/andrec-kevapps/config.xml \
			andrec_cordova bash -c "cordova build android \
			--release \
			-- \
			--keystore /secret/kevapps.pfx \
			--alias kevapps_one \
			--storePassword=$(keystore_pass) \
			--password=$(keystore_pass) && \
			cp /cordova/andrec-kevapps/platforms/android/app/build/outputs/apk/release/app-release.apk /dist/app-release.apk"

prod_build:
	docker build -f Dockerfile.prod -t kevashcraft/andrec-kevapps:latest .

prod_push: prod_build
	docker push kevashcraft/andrec-kevapps:latest

upgrade: prod_build prod_push
	helm upgrade andrec-kevapps ./helm --recreate-pods

install: prod_build prod_push
	helm install --name andrec-kevapps ./helm
