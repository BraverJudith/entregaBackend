import express from "express";
import { engine } from "express-handlebars";
import { createServer } from "http";
import { Server } from "socket.io";
import productsRouter from "./routes/products.router.js";
import cartsRouter from "./routes/carts.router.js";
import viewsRouter from "./routes/views.router.js";
import ProductManager from "./dao/fs/productManager.js";
import "./database.js";
import ProductModel from "./dao/models/product.model.js";

const PUERTO = 8080;
const app = express(); 

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("./src/public"));


// Express-Handlebars
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./src/views");

// Rutas
app.use("/api/carts", cartsRouter);
app.use("/api/products", productsRouter);
app.use("/", viewsRouter);

// Crea el servidor HTTP usando createServer de http
const httpServer = createServer(app);

// Inicia Socket.IO y pasar el servidor HTTP
const io = new Server(httpServer);

// Instancia de ProductManager
const productManager = new ProductManager("./src/data/products.json");

// Maneja eventos de conexión
io.on("connection", async (socket) => {
    console.log("Un cliente se conectó");

    try {
        const products = await ProductModel.find({}).lean();
        const productsWithStringId = products.map(product => ({
            ...product,
            _id: product._id.toString()
        }));
        socket.emit("products", productsWithStringId);

        socket.on("eliminarProducto", async (id) => {
            await ProductModel.findByIdAndDelete(id);
            const productosActualizados = await ProductModel.find({}).lean();
            const productosActualizadosConIdString = productosActualizados.map(product => ({
                ...product,
                _id: product._id.toString()
            }));
            io.emit("products", productosActualizadosConIdString);
        });

        socket.on("agregarProducto", async (producto) => {
            const nuevoProducto = new ProductModel(producto);
            await nuevoProducto.save();
            const productosActualizados = await ProductModel.find({}).lean();
            const productosActualizadosConIdString = productosActualizados.map(product => ({
                ...product,
                _id: product._id.toString()
            }));
            io.emit("products", productosActualizadosConIdString);
        });
    } catch (error) {
        console.error("Error al obtener productos:", error);
    }
});

// Escuchar el puerto
httpServer.listen(PUERTO, () => {
    console.log(`Escuchando en el puerto: ${PUERTO}`);
    app.use("/", viewsRouter);
});
