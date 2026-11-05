/**
 * Catálogo Oficial Geográfico y Académico de la República Bolivariana de Venezuela
 * Plataforma USM-ApostillaBot
 * 
 * Contiene:
 * 1. 24 Entidades Federales con Municipios y Taquillas Oficiales del MPPEU / Zonas Educativas.
 * 2. Catálogo Oficial de 23 Universidades Nacionales (Públicas y Privadas).
 * 3. Catálogo Oficial de Carreras y Títulos Homologados por el CNU / OPSU.
 * 4. Listado de Países Miembros del Convenio de La Haya (Apostilla Internacional).
 */

export const UNIVERSIDADES_CATALOGO = [
  "Universidad Central de Venezuela (UCV)",
  "Universidad Santa María (USM)",
  "Universidad Católica Andrés Bello (UCAB)",
  "Universidad Simón Bolívar (USB)",
  "Universidad de Carabobo (UC)",
  "Universidad de Los Andes (ULA)",
  "Universidad del Zulia (LUZ)",
  "Universidad Metropolitana (UNIMET)",
  "Universidad Nacional Experimental Politécnica de la FANB (UNEFA)",
  "Universidad Nacional Experimental Simón Rodríguez (UNESR)",
  "Universidad Pedagógica Experimental Libertador (UPEL)",
  "Universidad Centroccidental Lisandro Alvarado (UCLA)",
  "Universidad Rafael Belloso Chacín (URBE)",
  "Universidad José Antonio Páez (UJAP)",
  "Universidad Alejandro de Humboldt (UAH)",
  "Universidad Monteávila (UMA)",
  "Universidad Bicentenaria de Aragua (UBA)",
  "Universidad Rafael Urdaneta (URU)",
  "Universidad Yacambú (UNY)",
  "Universidad Nacional Experimental de Guayana (UNEG)",
  "Universidad Nacional Experimental de los Llanos Ezequiel Zamora (UNELLEZ)",
  "Universidad Nacional Experimental Francisco de Miranda (UNEFM)",
  "Universidad Bolivariana de Venezuela (UBV)",
  "Universidad Nacional Experimental Politécnica Antonio José de Sucre (UNEXPO)",
  "Universidad Santa María del Amazonas (USMA)",
  "Otra Institución Universitaria Registrada en el CNU"
];

export const CARRERAS_CATALOGO = [
  "Ingeniería de Sistemas",
  "Ingeniería Civil",
  "Ingeniería Industrial",
  "Ingeniería Mecánica",
  "Ingeniería Eléctrica",
  "Ingeniería Electrónica",
  "Ingeniería Química",
  "Ingeniería en Telecomunicaciones",
  "Ingeniería en Computación / Informática",
  "Ingeniería Geológica",
  "Ingeniería Metalúrgica",
  "Arquitectura",
  "Licenciatura en Derecho / Abogado",
  "Licenciatura en Administración de Empresas",
  "Licenciatura en Contaduría Pública",
  "Licenciatura en Economía",
  "Licenciatura en Comunicación Social",
  "Licenciatura en Relaciones Internacionales",
  "Medicina General / Médico Cirujano",
  "Odontología",
  "Farmacia",
  "Licenciatura en Enfermería",
  "Licenciatura en Bioanálisis",
  "Licenciatura en Psicología",
  "Licenciatura en Educación (Mención Integral)",
  "Licenciatura en Biología",
  "Licenciatura en Química",
  "Licenciatura en Física",
  "Licenciatura en Matemáticas",
  "Otro Título Universitario Oficial"
];

export const PAISES_CONVENIO_HAYA = [
  "España",
  "Estados Unidos de América",
  "Chile",
  "Colombia",
  "Argentina",
  "Italia",
  "Portugal",
  "México",
  "Panamá",
  "Perú",
  "Ecuador",
  "Francia",
  "Alemania",
  "Reino Unido",
  "Canadá",
  "Brasil",
  "Uruguay",
  "Costa Rica",
  "República Dominicana",
  "Australia",
  "Países Bajos",
  "Suiza",
  "Bélgica",
  "Polonia",
  "Otro País Miembro del Convenio de La Haya"
];

export const ESTADOS_VENEZUELA = [
  {
    estado: "Distrito Capital",
    municipios: ["Libertador"],
    taquillas: [
      {
        nombre: "Taquilla Central MPPEU — Edif. CNU (Caracas)",
        direccion: "Calle Este 2, entre esquinas Dr. Paúl y Salvador de León, La Hoyada, Caracas.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM (Previa Cita Digital)"
      },
      {
        nombre: "Sede Zona Educativa del Distrito Capital",
        direccion: "Av. Este 3, Esq. Alcabala, Edif. Ministerial, La Candelaria, Caracas.",
        horario: "Lunes a Jueves 8:30 AM - 1:30 PM"
      }
    ]
  },
  {
    estado: "Miranda",
    municipios: ["Sucre", "Chacao", "Baruta", "Guaicaipuro", "Plaza", "Zamora", "Cristóbal Rojas", "Los Salias", "Carrizal", "Independencia"],
    taquillas: [
      {
        nombre: "Zona Educativa de Miranda (Los Teques)",
        direccion: "Calle Miranda con Calle Guaicaipuro, Edif. Centro Cívico, Los Teques.",
        horario: "Lunes a Viernes 8:00 AM - 12:30 PM"
      },
      {
        nombre: "Taquilla Ministerial Eje Metropolitano — Los Dos Caminos",
        direccion: "Av. Francisco de Miranda, Edif. Sucre, Mezzanina 2, Municipio Sucre.",
        horario: "Lunes a Jueves 8:30 AM - 1:00 PM"
      },
      {
        nombre: "Taquilla Universitaria Eje Guarenas-Guatire",
        direccion: "Av. Intercomunal Guarenas-Guatire, C.C. Miranda, Nivel Mezzanina.",
        horario: "Martes y Jueves 8:30 AM - 12:30 PM"
      }
    ]
  },
  {
    estado: "Aragua",
    municipios: ["Girardot", "Santiago Mariño", "José Félix Ribas", "Mario Briceño Iragorry", "Sucre", "Libertador", "Zamora"],
    taquillas: [
      {
        nombre: "Zona Educativa del Estado Aragua (Maracay)",
        direccion: "Av. Miranda Este, cruce con Calle Mariño, Edif. Educativo, Maracay.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      },
      {
        nombre: "Taquilla de Cotejo MPPEU — Sector Calicanto",
        direccion: "Calle López Aveledo, Sector Calicanto, Maracay.",
        horario: "Lunes a Jueves 8:30 AM - 12:30 PM"
      }
    ]
  },
  {
    estado: "Carabobo",
    municipios: ["Valencia", "Naguanagua", "San Diego", "Puerto Cabello", "Guacara", "Los Guayos", "Libertador"],
    taquillas: [
      {
        nombre: "Zona Educativa de Carabobo (Valencia)",
        direccion: "Av. Montes de Oca con Calle Libertad, Edif. San José, Centro de Valencia.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      },
      {
        nombre: "Taquilla Universitaria Naguanagua — Eje Norte",
        direccion: "Av. Universidad, C.C. La Granja, Mezzanina Local M-14, Naguanagua.",
        horario: "Lunes a Jueves 8:30 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Zulia",
    municipios: ["Maracaibo", "San Francisco", "Cabimas", "Lagunillas", "Mara", "Rosario de Perijá", "Colón"],
    taquillas: [
      {
        nombre: "Zona Educativa del Estado Zulia (Maracaibo)",
        direccion: "Av. 4 Bella Vista, entre Calles 74 y 75, Maracaibo.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      },
      {
        nombre: "Taquilla MPPEU San Francisco — Eje Sur",
        direccion: "Av. 5 con Calle 158, Sector Coromoto, San Francisco.",
        horario: "Lunes a Jueves 8:30 AM - 12:30 PM"
      }
    ]
  },
  {
    estado: "Lara",
    municipios: ["Iribarren", "Palavecino", "Torres", "Morán", "Jiménez", "Crespo"],
    taquillas: [
      {
        nombre: "Zona Educativa del Estado Lara (Barquisimeto)",
        direccion: "Carrera 18 con Calle 25, Edif. San Antonio, Barquisimeto.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      },
      {
        nombre: "Taquilla Universitaria Cabudare — Eje Palavecino",
        direccion: "Av. La Mata con Calle 9, Edif. Municipal, Cabudare.",
        horario: "Martes y Jueves 8:30 AM - 12:30 PM"
      }
    ]
  },
  {
    estado: "Anzoátegui",
    municipios: ["Simón Bolívar", "Juan Antonio Sotillo", "Diego Bautista Urbaneja", "Anaco", "Pedro María Freites", "Simón Rodríguez"],
    taquillas: [
      {
        nombre: "Zona Educativa de Anzoátegui (Barcelona)",
        direccion: "Av. Fuerzas Armadas, cruce con Av. Caracas, Barcelona.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      },
      {
        nombre: "Taquilla Universitaria Eje Metropolitano — Puerto La Cruz",
        direccion: "Calle Freites con Av. 5 de Julio, Puerto La Cruz.",
        horario: "Lunes a Jueves 8:30 AM - 12:30 PM"
      }
    ]
  },
  {
    estado: "Bolívar",
    municipios: ["Angostura del Orinoco (Heres)", "Caroní", "Piar", "Roscio", "Sifontes"],
    taquillas: [
      {
        nombre: "Zona Educativa del Estado Bolívar (Ciudad Bolívar)",
        direccion: "Paseo Heres, Edif. Ministerial, Casco Histórico, Ciudad Bolívar.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      },
      {
        nombre: "Taquilla Universitaria Puerto Ordaz (Caroní)",
        direccion: "Av. Paseo Caroní, Alta Vista Sur, Edif. Corporativo, Puerto Ordaz.",
        horario: "Lunes a Jueves 8:30 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Mérida",
    municipios: ["Libertador", "Campo Elías", "Alberto Adriani", "Sucre", "Tovar"],
    taquillas: [
      {
        nombre: "Zona Educativa de Mérida (Casco Central)",
        direccion: "Av. 3 Independencia, entre Calles 21 y 22, Edif. Hermes, Mérida.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Táchira",
    municipios: ["San Cristóbal", "Cárdenas", "Junín", "Bolívar", "Pedro María Ureña", "Torbes"],
    taquillas: [
      {
        nombre: "Zona Educativa del Estado Táchira (San Cristóbal)",
        direccion: "Av. 19 de Abril con Calle 14, Edif. Ministerial, San Cristóbal.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Falcón",
    municipios: ["Miranda", "Carirubana", "Los Taques", "Silva", "Colina"],
    taquillas: [
      {
        nombre: "Zona Educativa de Falcón (Coro)",
        direccion: "Calle Falcón, entre Calles Ampíes y Toledo, Coro.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      },
      {
        nombre: "Taquilla Universitaria Punto Fijo (Paraguaná)",
        direccion: "Calle Comercio con Calle Arismendi, Sector Centro, Punto Fijo.",
        horario: "Lunes a Jueves 8:30 AM - 12:30 PM"
      }
    ]
  },
  {
    estado: "Nueva Esparta",
    municipios: ["Mariño", "Maneiro", "Arismendi", "Gómez", "García", "Díaz"],
    taquillas: [
      {
        nombre: "Zona Educativa de Nueva Esparta (La Asunción)",
        direccion: "Calle San Nicolás, cruce con Calle Matasiete, La Asunción, Isla de Margarita.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Monagas",
    municipios: ["Maturín", "Ezequiel Zamora", "Caripe", "Piar", "Bolívar"],
    taquillas: [
      {
        nombre: "Zona Educativa de Monagas (Maturín)",
        direccion: "Av. Bicentenario, Edif. Guayana, Nivel PB, Maturín.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Sucre",
    municipios: ["Sucre", "Bermúdez", "Montes", "Ribero", "Cruz Salmerón Acosta"],
    taquillas: [
      {
        nombre: "Zona Educativa del Estado Sucre (Cumaná)",
        direccion: "Calle Montes con Calle Sucre, Casco Central, Cumaná.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Barinas",
    municipios: ["Barinas", "Bolívar", "Pedraza", "Alberto Arvelo Torrealba", "Sucre"],
    taquillas: [
      {
        nombre: "Zona Educativa de Barinas (Ciudad de Barinas)",
        direccion: "Av. Marqués de Pumar, entre Calles 5 de Julio y Cedeño, Barinas.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Portuguesa",
    municipios: ["Guanare", "Páez", "Araure", "Turén", "Esteller"],
    taquillas: [
      {
        nombre: "Zona Educativa de Portuguesa (Guanare)",
        direccion: "Carrera 4 con Calle 16, Edif. Educativo Guanare.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Yaracuy",
    municipios: ["San Felipe", "Independencia", "Peña", "Nirgua", "Bruzual"],
    taquillas: [
      {
        nombre: "Zona Educativa de Yaracuy (San Felipe)",
        direccion: "Av. Caracas, entre Calles 10 y 11, San Felipe.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Trujillo",
    municipios: ["Trujillo", "Valera", "Boconó", "Carache", "Urdaneta"],
    taquillas: [
      {
        nombre: "Zona Educativa de Trujillo (Ciudad Capital)",
        direccion: "Av. Independencia con Calle Arismendi, Trujillo.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Guárico",
    municipios: ["Juan Germán Roscio", "Leonardo Infante", "Francisco de Miranda", "Zaraza", "Monagas"],
    taquillas: [
      {
        nombre: "Zona Educativa de Guárico (San Juan de los Morros)",
        direccion: "Av. Bolívar, cruce con Calle Roscio, San Juan de los Morros.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Cojedes",
    municipios: ["Ezequiel Zamora", "Tinaquillo", "Tinaco", "Lima Blanco"],
    taquillas: [
      {
        nombre: "Zona Educativa de Cojedes (San Carlos)",
        direccion: "Av. Bolívar con Calle Sucre, San Carlos.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "La Guaira",
    municipios: ["Vargas"],
    taquillas: [
      {
        nombre: "Zona Educativa de La Guaira (Eje Litoral)",
        direccion: "Av. Soublette, Edif. IPOSTEL, Piso 2, Maiquetía.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Apure",
    municipios: ["San Fernando", "Biruaca", "Páez", "Achaguas"],
    taquillas: [
      {
        nombre: "Zona Educativa de Apure (San Fernando)",
        direccion: "Paseo Libertador, Edif. Regional, San Fernando de Apure.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Amazonas",
    municipios: ["Atures", "Autana", "Atabapo", "Río Negro"],
    taquillas: [
      {
        nombre: "Zona Educativa de Amazonas (Puerto Ayacucho)",
        direccion: "Av. 23 de Enero con Av. Orinoco, Puerto Ayacucho.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  },
  {
    estado: "Delta Amacuro",
    municipios: ["Tucupita", "Casacoima", "Antonio Díaz", "Pedernales"],
    taquillas: [
      {
        nombre: "Zona Educativa de Delta Amacuro (Tucupita)",
        direccion: "Calle Dalla Costa, cruce con Calle Pativilca, Tucupita.",
        horario: "Lunes a Viernes 8:00 AM - 1:00 PM"
      }
    ]
  }
];

