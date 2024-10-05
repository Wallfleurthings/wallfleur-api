app = require('./app')
const port = process.env.PORT || 5001;

app.listen(port, '0.0.0.0', ()=>{
    console.log(`server is runing on port ${port}`);
})