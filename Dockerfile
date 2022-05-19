# Install dependencies only when needed
FROM node:16-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install

# Rebuild the source code only when needed
FROM node:16-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn build

# Production image, copy all the files and run next
FROM nginx:1.20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
ENV PORT 80

CMD ["nginx", "-g", "daemon off;"]