"""
Módulo de Visión Computacional Especializado para Títulos Universitarios y Pergaminos.
Universidad Santa María (USM) - Proyecto de Grado
"""

import cv2
import numpy as np
from PIL import Image


class USMDocumentPreprocessor:
    """
    Pipeline de procesamiento morfológico y geométrico de imágenes con OpenCV.
    Especializado en pergaminos y documentos solemnes con tipografías góticas y serif.
    """

    @staticmethod
    def deskew(image: np.ndarray) -> np.ndarray:
        """
        Detecta y corrige el ángulo de inclinación del documento escaneado.
        Utiliza el rectángulo delimitador de área mínima sobre contornos de texto binarizado.
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Invertir para que el texto sea blanco sobre fondo negro
        gray_inverted = cv2.bitwise_not(gray)

        # Umbralización de Otsu para detectar la masa de caracteres
        thresh = cv2.threshold(
            gray_inverted, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU
        )[1]

        coords = np.column_stack(np.where(thresh > 0))
        if coords.shape[0] < 50:
            return image

        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        # Aplicar rotación afín si la desviación es apreciable (> 0.35 grados)
        if abs(angle) > 0.35:
            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(
                image,
                M,
                (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE,
            )
            return rotated

        return image

    @classmethod
    def preprocess_for_gothic(cls, image: np.ndarray) -> np.ndarray:
        """
        Preprocesamiento morfológico adaptativo para fuentes góticas (Old English Text MT / Diploma):
        1. Corrección de ángulo (Deskew).
        2. Atenuación de textura de pergamino mediante Filtrado Bilateral.
        3. Realce de bordes y trazos góticos mediante CLAHE.
        4. Binarización Gaussiana Adaptativa.
        5. Cierre morfológico leve para unir trazos quebrados.
        """
        # 1. Corrección angular
        corrected = cls.deskew(image)

        if len(corrected.shape) == 3:
            gray = cv2.cvtColor(corrected, cv2.COLOR_BGR2GRAY)
        else:
            gray = corrected.copy()

        # 2. Filtrado Bilateral: Suprime el ruido y textura del papel pergamino
        # conservando la nitidez de los bordes caligráficos
        denoised = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)

        # 3. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        contrast_enhanced = clahe.apply(denoised)

        # 4. Umbralización adaptativa gaussiana
        binarized = cv2.adaptiveThreshold(
            contrast_enhanced,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            11,
        )

        # 5. Cierre morfológico para conectar trazos caligráficos discontinuos
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        clean_image = cv2.morphologyEx(binarized, cv2.MORPH_CLOSE, kernel)

        return clean_image

    @classmethod
    def segment_zones(cls, image: np.ndarray):
        """
        Segmentación espacial por áreas tipográficas en pergaminos universitarios:
        - Zona 1 (Encabezado gótico): 38% superior (República, USM, Nombre del Título).
        - Zona 2 (Cuerpo del texto serif): 62% inferior (Graduando, C.I., Autoridades, Registro).
        """
        h, w = image.shape[:2]
        header_cutoff = int(h * 0.38)

        header_roi = image[0:header_cutoff, 0:w]
        body_roi = image[header_cutoff:h, 0:w]

        return header_roi, body_roi

