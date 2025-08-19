import swaggerJsdoc from "swagger-jsdoc"
import swaggerUi from "swagger-ui-express"

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SOA Backend 1 API",
      version: "1.0.0",
      description: "API para gestión de usuarios y ventas",
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Servidor de desarrollo",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js"],
}

const specs = swaggerJsdoc(options)

const swaggerSetup = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs))
  console.log("📚 Swagger disponible en http://localhost:3001/api-docs")
}

export default swaggerSetup
