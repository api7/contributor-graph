#!/usr/bin/env bash

helm uninstall contributor-graph-${ID} -n contributor-graph
kubectl delete ingress contributor-graph-${ID} -n contributor-graph
