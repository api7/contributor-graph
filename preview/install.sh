#!/usr/bin/env bash
IMAGE_REGISTRY="api7registry.azurecr.io"
IMAGE_REPOSITORY="contributor-graph"
IMAGE_TAG=${ID}

helm upgrade contributor-graph-${ID} "./preview/contributor-graph" \
  --install \
  --namespace "contributor-graph" \
  --set image.registry="${IMAGE_REGISTRY}" \
  --set image.repository="${IMAGE_REPOSITORY}" \
  --set image.tag="${IMAGE_TAG}" \
  --set image.imagePullSecrets[0]="api7registry" \
  --set image.pullPolicy="Always" \

HOST="contributor-graph-${ID}.preview.api7.ai"
SVC="contributor-graph-${ID}"
echo "
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${SVC}
  annotations:
    kubernetes.io/ingress.class: addon-http-application-routing
spec:
  rules:
  - host: ${HOST}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${SVC}
            port:
              number: 80" | kubectl apply -f - -n contributor-graph

