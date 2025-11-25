require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require("fs");
const morgan = require("morgan");
const swaggerUi = require('swagger-ui-express');
const app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
  // morgan.format('myFormat', ':method :url | status :status | :response-time ms');
  // app.use(morgan('dev')); 
  app.use(
    morgan(':method :url :status :res[content-length] - :response-time ms - :remote-addr')
  );

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' } // append mode
);

app.use(morgan('combined', { stream: accessLogStream }));

const port = process.env.PORT;
const moment = require('moment');
const formatLog = require("./utils/reports");
const swaggerSpec = require('./config/swagger');
const {
  deviceOn,
  deviceOff,
  getOnlineDevices,
  getDeviceBySocketId
} = require("./utils/devices");
const {
  cameraOn,
  cameraOff,
  getPoleCameras,
  getOnlinePoleCameras,
  getOfflinePoleCameras,
  printStatus
} = require("./utils/cameras")
const notificationModel = require('./models/Notification');
const userModel = require('./models/user');
const poleModel = require('./models/Pole');
const cameraModel = require('./models/Camera');
let fetchPoles = [];
async function fetchAllDevicesFromDB() {
  try {
    fetchPoles = await await poleModel.getPoles();
  } catch (err) {
    console.error(err);
    fetchPoles = [];
  }
}
fetchAllDevicesFromDB()

function getDevicesWithStatus() {
  const allDevicesFromDB = fetchPoles;
  const onlineDevices = getOnlineDevices();

  return allDevicesFromDB.map(dev => {
    const isOnline = onlineDevices.some(
      d => d.code === dev.code || d.pole === dev.code
    );
    dev.status = isOnline ? 1 : 0;
    return dev;
  });
}

async function getCamerasWithStatus(pole_code) {
  const allCamerasFromDB = await cameraModel.getCamerasByPoleCode(pole_code);
  const onlineCameras = getOnlinePoleCameras(pole_code);

  return allCamerasFromDB.map(dev => {
    const isOnline = onlineCameras.some(
      d => d.device.camera_ip === dev.camera_ip
    );
    dev.status = isOnline ? 1 : 0;
    return dev;
  });
}
async function excecuteCameraBySocket(integration_data) {
  io.to(integration_data.data.pole_code).emit('execute_camera',integration_data);
}

async function alertCameraDisconnected(alert) {
  try {
    const users = await userModel.getActiveUsersWithViewNotificationPermission();
    const user_ids = users.map(u => u.user_id);
    await notificationModel.createNotificationsForUsers([
      {
        user_id: user_ids,
        pole_router_ip: alert.router_ip,
        pole_code: alert.pole_code,
        description: 'camera disconnected',
        note: 'file_server_id: '+alert.file_server_id+' camera ip: '+alert.camera_ip
      }
    ]);
    io.emit('notification', {
      title: 'camera disconnected',
      message: `file_server_id: ${alert.file_server_id}`
    });

  } catch (err) {
    // add log here
    console.error('❌ Error creating notifications:', err);
  } 
}

module.exports = { getDevicesWithStatus,getCamerasWithStatus, excecuteCameraBySocket };

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/docs.json', (req, res) => res.json(swaggerSpec));
app.get('/openapi.json', (req, res) => res.json(swaggerSpec));

// // socket start code
// // ==========================================================
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("Server B connected:", socket.id);
  socket.emit('returnSocketId',socket.id);

  socket.on("onlineDevice", (device) => {
    const devices = deviceOn(socket.id, device);
    // console.log(device.router_ip);
    socket.join(device.pole_code);
    io.emit("sendCloudFront", getDevicesWithStatus() );
  });

  socket.on("frontJoinToPoleCode", (pole_code) => {
    socket.join(pole_code);
    console.log(`Client ${socket.id} joined room ${pole_code}`);
  });

  socket.on("cameraOnline", (cam) => {
    // console.log(cam , 'camera online');
    socket.join(cam.pole_code);
    time =  moment().format('h:mm a');
    cameraOn(socket.id, cam , cam.pole_code);
    io.to(cam.pole_code).emit("showCameras", getPoleCameras(cam.pole_code) );
  });
  
  socket.on("cameraOffline", (cam) => {
    const onlineCams = getOnlinePoleCameras(cam.pole_code);
    const camExists = onlineCams.some(c =>
      c.device.camera_ip === cam.camera_ip &&
      c.pole_code === cam.pole_code
    );
    if (camExists) {
      alertCameraDisconnected(cam);
    }
    socket.join(cam.pole_code);
    time =  moment().format('h:mm a');   
    
    cameraOff(socket.id,cam,cam.pole_code);
    io.to(cam.pole_code).emit("showCameras", getPoleCameras(cam.pole_code) );
  });

  socket.on("disconnect", async () => {
    const alert = await getDeviceBySocketId(socket.id);
    deviceOff(socket.id);
    io.emit("sendCloudFront", getDevicesWithStatus());
    try {
      const users = await userModel.getActiveUsersWithViewNotificationPermission();
      const user_ids = users.map(u => u.user_id);
      if(alert){
        await notificationModel.createNotificationsForUsers([
          {
            user_id: user_ids,
            pole_router_ip: alert.router_ip,
            pole_code: alert.code,
            description: 'device disconnected',
            note: 'file_server_id: '+alert.file_server_id
          }
        ]);
        // console.log('✅ Notifications saved for alert:', alert);
        io.emit('notification', {
          title: 'device disconnected',
          message: `file_server_id: ${alert.file_server_id}`
        });
      }

    } catch (err) {
      // add log here
      console.error('❌ Error creating notifications:', err);
    }
    // clearInterval(cmdInterval);
  });

  // app.get('/file-server-resources/:pole_code', async (req, res) => {
  //   try {
  //     io.to(req.params.pole_code).emit("getServerResources");
  //     // res.json(res.data);
  //   } catch (error) {
  //     res.status(500).json({ error: 'Cannot fetch Server B resources' });
  //   }
  // });

  socket.on("orderResources", (pole_code , socketId) => {
    console.log(pole_code);
    io.to(pole_code).emit("getServerResources",socketId);
  });

  // Listen for response from server B
  socket.on("serverResources", (data) => {
    console.log(`Resources from Server B (${socket.id}): (${data.pole_code})`);
    // io.emit("showServerBResources", data);
    io.to(data.socketId).emit("showServerBResources",data);
    // io.to(data.pole_code).emit("showServerBResources",data);
  });

  socket.on('alert', async (alert) => {
    try {
      // console.log('userModel:', Object.keys(userModel));
      const users = await userModel.getActiveUsersWithViewNotificationPermission();
      const user_ids = users.map(u => u.user_id);
      // console.log(user_ids);
      await notificationModel.createNotificationsForUsers([
        {
          user_id: user_ids,
          pole_router_ip: alert.pole_router_ip,
          pole_code: alert.pole_code,
          description: alert.title,
          note: alert.file_server_id +' >> '+ alert.message
        }
      ]);

      // console.log('✅ Notifications saved for alert:', alert);
      io.emit('notification', alert);

    } catch (err) {
      // add log here
      console.error('❌ Error creating notifications:', err);
    }
  });


  socket.on('sendToCloudLog',(data) => {
    // add log here
    // console.log('data here ',data)
  });

});
// // ==========================================================
// // socket end code


// async function mainQuery(query) {
//   const db = await connectDB();
//   const [rows] = await db.execute(query);
//   console.log(rows);
//   await db.end();
// }
// var id = 1;
// mainQuery('SELECT * FROM users where id = '+id);

// console.log(users.usersModel(data) );
// console.log( users.update(id , data) );


// async function createNewUser(data) {
//   const newUser = await usersModel.create({
//     username: data.username,
//     password: data.password,
//     active: data.active,
//     designation: data.designation,
//   });
//   console.log('Inserted user:', newUser.insertId);
// }
// createNewUser({
//   'username':'wassim13',
//   'password':'12345678',
//   'active':'1',
//   'designation':'admin'
// });


// test section 

// app.get("/showCameras/:pole_code", async (req, res) => {
//   printStatus(req.params.pole_code);
//   try {
//     cams = getPoleCameras(req.params.pole_code)
//     res.json(cams);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error fetching poles");
//   }
// });

// app.get("/showDevices", async (req, res) => {
//   try {
//     devices = getDevicesWithStatus()
//     res.json(devices);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error fetching poles");
//   }
// });

// app.get("/index", (req, res) => {
//   res.sendFile(__dirname + "/public/index.html");
// });

// app.get("/create-zone/:location_id", (req, res) => {
//   res.sendFile(__dirname + "/public/createZone.html");
// });
// app.get("/location/:location_id", (req, res) => {
//   res.sendFile(__dirname + "/public/showLocation.html");
// });
// app.get("/create_location", (req, res) => {
//   res.sendFile(__dirname + "/public/createLocation.html");
// });

// app.get("/show/:pole_code", (req, res) => {
//   res.sendFile(__dirname + "/public/show.html");
// });


// end test section 

app.get('/', (req, res) => {
  console.log('test main server route');
  res.send('test_route');
});

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});