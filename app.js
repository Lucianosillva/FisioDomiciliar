
//versão 1


const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');


// Configuração do Express
const app = express();
const db = new sqlite3.Database('./database.db');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
  secret: 'secret-key', // chave para criptografar as sessões
  resave: false,
  saveUninitialized: true
}));

// Criação das tabelas no banco de dados, caso não existam
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS appointments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, date TEXT, time TEXT, details TEXT, FOREIGN KEY(user_id) REFERENCES users(id))");
});

// Rota para a página inicial
app.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/appointments');
    }
    res.redirect('/login');
});

// Página de Cadastro
app.get('/register', (req, res) => {
    res.send(`
        <h1>Cadastro de Paciente</h1>
        <form action="/register" method="POST">
            Nome: <input type="text" name="name" required><br>
            Email: <input type="email" name="email" required><br>
            Senha: <input type="password" name="password" required><br>
            <button type="submit">Cadastrar</button>
        </form>
        <a href="/login">Já tem uma conta? Faça login</a>
    `);
});

// Processando o Cadastro
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).send("Erro ao criptografar a senha");
        }
        
        db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword], (err) => {
            if (err) {
                return res.status(500).send("Erro ao registrar usuário");
            }
            res.send("Usuário cadastrado com sucesso! <a href='/login'>Faça login</a>");
        });
    });
});

// Página de Login
app.get('/login', (req, res) => {
    res.send(`
        <h1>Login</h1>
        <form action="/login" method="POST">
            Email: <input type="email" name="email" required><br>
            Senha: <input type="password" name="password" required><br>
            <button type="submit">Entrar</button>
        </form>
        <a href="/register">Ainda não tem conta? Cadastre-se</a>
    `);
});

// Processando o Login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err || !row) {
            return res.status(400).send("Usuário não encontrado");
        }

        bcrypt.compare(password, row.password, (err, isMatch) => {
            if (err || !isMatch) {
                return res.status(400).send("Senha inválida");
            }

            // Criar uma sessão para o usuário
            req.session.userId = row.id;
            req.session.userName = row.name;
            res.redirect('/appointments');
        });
    });
});



//alteração data
// Página de Agendamentos (para pacientes logados)
app.get('/appointments', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    db.all("SELECT * FROM appointments WHERE user_id = ?", [req.session.userId], (err, rows) => {
        if (err) {
            return res.status(500).send("Erro ao buscar agendamentos");
        }

        let appointmentsHtml = "<h1>Meus Agendamentos</h1>";
        appointmentsHtml += "<a href='/logout'>Sair</a><br><br>";

        if (rows.length === 0) {
            appointmentsHtml += "Você ainda não tem agendamentos.";
        } else {
            rows.forEach(appointment => {
                // Formatar a data para dd/mm/aa
                const formattedDate = new Intl.DateTimeFormat('pt-BR').format(new Date(appointment.date));

                appointmentsHtml += `<p><strong>Data:</strong> ${formattedDate} <strong>Hora:</strong> ${appointment.time} <strong>Detalhes:</strong> ${appointment.details}</p>`;
            });
        }

        appointmentsHtml += `<br><a href='/schedule'>Agendar nova sessão</a>`;
        res.send(appointmentsHtml);
    });
});


// Página de Agendamento (formulário)
app.get('/schedule', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    res.send(`
        <h1>Agendar Sessão de Fisioterapia</h1>
        <form action="/schedule" method="POST">
            Data: <input type="date" name="date" required><br>
            Hora: <input type="time" name="time" required><br>
            Detalhes: <textarea name="details"></textarea><br>
            <button type="submit">Agendar</button>
        </form>
    `);
});

// Processando o Agendamento
app.post('/schedule', (req, res) => {
    const { date, time, details } = req.body;
    const userId = req.session.userId;

    db.run("INSERT INTO appointments (user_id, date, time, details) VALUES (?, ?, ?, ?)", [userId, date, time, details], (err) => {
        if (err) {
            return res.status(500).send("Erro ao agendar a sessão");
        }
        res.redirect('/appointments');
    });
});

// Logout do paciente
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Erro ao sair");
        }
        res.redirect('/');
    });
});

// Inicia o servidor
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});






