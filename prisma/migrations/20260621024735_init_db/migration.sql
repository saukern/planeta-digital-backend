-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre_usuario" VARCHAR(255) NOT NULL,
    "correo" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proveedor" VARCHAR(50) NOT NULL,
    "rol" VARCHAR(50) NOT NULL DEFAULT 'USER',
    "estado" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "url_nube" TEXT NOT NULL,
    "formato" VARCHAR(50) NOT NULL,

    CONSTRAINT "archivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "libros" (
    "id" INTEGER NOT NULL,
    "autor" VARCHAR(255) NOT NULL,
    "genero" VARCHAR(255) NOT NULL,

    CONSTRAINT "libros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" INTEGER NOT NULL,
    "materia" VARCHAR(255) NOT NULL,
    "tipo_documento" VARCHAR(100) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progreso_usuario" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "archivo_id" INTEGER NOT NULL,
    "pagina_actual" INTEGER NOT NULL DEFAULT 0,
    "estado_lectura" VARCHAR(50) NOT NULL,
    "calificacion_personal" INTEGER,
    "resena_personal" TEXT,
    "agregado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progreso_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_lectura" (
    "id" SERIAL NOT NULL,
    "progreso_usuario_id" INTEGER NOT NULL,
    "fecha_sesion" DATE NOT NULL,
    "duracion_minutos" INTEGER NOT NULL,
    "paginas_leidas" INTEGER NOT NULL,

    CONSTRAINT "sesiones_lectura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anotaciones" (
    "id" SERIAL NOT NULL,
    "progreso_usuario_id" INTEGER NOT NULL,
    "marcador_posicion" VARCHAR(255) NOT NULL,
    "texto_resaltado" TEXT NOT NULL,
    "nota_usuario" TEXT,
    "color_hex" VARCHAR(7) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anotaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas_literarias" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "libros_objetivo" INTEGER NOT NULL,

    CONSTRAINT "metas_literarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logros" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "codigo_insignia" VARCHAR(100) NOT NULL,

    CONSTRAINT "logros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logros_usuario" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "logro_id" INTEGER NOT NULL,
    "desbloqueado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logros_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_nombre_usuario_key" ON "usuarios"("nombre_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "metas_literarias_usuario_id_anio_key" ON "metas_literarias"("usuario_id", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "logros_codigo_insignia_key" ON "logros"("codigo_insignia");

-- CreateIndex
CREATE UNIQUE INDEX "logros_usuario_usuario_id_logro_id_key" ON "logros_usuario"("usuario_id", "logro_id");

-- AddForeignKey
ALTER TABLE "libros" ADD CONSTRAINT "libros_id_fkey" FOREIGN KEY ("id") REFERENCES "archivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_id_fkey" FOREIGN KEY ("id") REFERENCES "archivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progreso_usuario" ADD CONSTRAINT "progreso_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progreso_usuario" ADD CONSTRAINT "progreso_usuario_archivo_id_fkey" FOREIGN KEY ("archivo_id") REFERENCES "archivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_lectura" ADD CONSTRAINT "sesiones_lectura_progreso_usuario_id_fkey" FOREIGN KEY ("progreso_usuario_id") REFERENCES "progreso_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anotaciones" ADD CONSTRAINT "anotaciones_progreso_usuario_id_fkey" FOREIGN KEY ("progreso_usuario_id") REFERENCES "progreso_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_literarias" ADD CONSTRAINT "metas_literarias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logros_usuario" ADD CONSTRAINT "logros_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logros_usuario" ADD CONSTRAINT "logros_usuario_logro_id_fkey" FOREIGN KEY ("logro_id") REFERENCES "logros"("id") ON DELETE CASCADE ON UPDATE CASCADE;
