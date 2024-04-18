//mongodb配置
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://root:root123@mycluster.gfgemlu.mongodb.net/?retryWrites=true&w=majority&appName=myCluster";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
let db = null;
async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("成功連結資料庫");
        db = client.db("member-system");
    } catch(e){
        console.log("有錯誤",e);
    }
}
run().catch(console.dir);
//依賴配置
const express = require("express");
const app = express();
const session = require("express-session");
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));
app.use(express.urlencoded({extended: true}));
app.use(session({
    secret: "key",
    resave: false,
    saveUninitialized: true
}));
//路由配置
app.listen(3000, () => {
    console.log("正在聆聽localhost3000");
});
//錯誤路由
app.get("/error", (req, res) => {
    let msg = req.query.msg
    res.render("error.ejs", {msg});
});
//登入路由
app.post("/login", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    let collection = db.collection("member");
    try{
        let result = await collection.findOne({
            $and: [
                {email: email},
                {password: password}
            ]
        });
        if(result === null){
            res.redirect("/error?msg=錯誤的帳號或密碼");
            return;
        }
        req.session.data = result;
        res.redirect("/member");
    }catch(err){
        console.log("有錯誤", err)
        res.redirect("/error");
    }    
});
//註冊路由
app.get("/signup", (req, res) => {
    res.render("signup.ejs");
});
//註冊成功路由
app.post("/signup-success", async (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    if(!name || !email || !password){
        res.redirect("/error?msg=有欄位為空，請填寫");
        return;
    }
    let collection = db.collection("member");
    let result = await collection.findOne({email});
    if(result !== null){
        res.redirect("/error?msg=重複的帳號或密碼");
        return;
    }
    await collection.insertOne({name, email, password})
    res.redirect("/");
});
//會員留言板路由
app.get("/member", async (req, res) =>{
    if(!req.session.data){
        res.redirect("/");
        return;
    }
    const sort = req.query.sort || "new";
    const sortValue = sort === "new" ? -1 : 1;
    let collection = db.collection("comment");
    let result = await collection.find({}).sort({
        date: sortValue
    }).toArray();
    let data = req.session.data;
    res.render("member.ejs", {data, result}); 
});
//留言路由
app.post("/comment", async (req, res) => {
    if(req.body.comment === ""){
        res.redirect("/comment-error?msg=需填寫留言");
        return;
    }
    const date = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    const comment = req.body.comment;
    const name = req.session.data.name;
    let collection = db.collection("comment");
    let result = await collection.insertOne({date, comment, name})
    res.redirect("/member");
});
//留言失敗路由
app.get("/comment-error", (req, res) => {
    let msg = req.query.msg;
    res.render("comment-error.ejs", {msg});
});
//登出路由
app.get("/logout", (req, res) => {
    req.session.data = null;
    res.redirect("/");
})

