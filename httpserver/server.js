
//Vi trenger Express, og vi må instansiere
const express = require('express');
const app = express();
let port = 3000;
//SOCKET IO
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

//JSON Parser
const bodyParser = require('body-parser');

//PATH FETCH
const path = require('path');
app.use(express.static(path.join(__dirname, 'build')));

//Question variables, fetches a list of questions from questions.json, and defines which question we're at as number 0.
const questions = require('./questions.json');
let whichNumberQuestion = 0;

//CurrentQuiz tells us which question we're currently at, and currentquestion, currentoption tells us which question, and which options that are available.
let currentQuiz = questions.quiz[whichNumberQuestion]
let currentQuestion = currentQuiz.question;
let currentOption = currentQuiz.options;

//setInterval is a function that will run the argumented function every X second, in this case every 30th second. sendNewQuestionToFrontend gives the frontend a new question.
setInterval(sendNewQuestionToFrontend, 30000);

//CORS - Cross Origin Resource Sharing: Could have issues with sending information from different origins: this should solve any issue.
const cors = require('cors');
app.use(cors())

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Listens to GET requests, and serves the build folder under /httpserver/build.
//Build folder needs to be generated in the reactapp folder, and then moved to the httpserver folder.
app.get('/', (req, res) => {
    res.sendFile(__dirname, 'build' , 'index.html');
})

//Loops through the list of questions, sending the next ready one, while incrementing whichNumberQuestion.
//When the list of questions has been gone through, it'll reset to 0 and restart the quiz.
function sendNewQuestionToFrontend() {
    if(questions.quiz[whichNumberQuestion]) {
        //Updates some variables, so that other functions that use them have the correct information about which question we're at.
        currentQuiz = questions.quiz[whichNumberQuestion]
        currentOption = currentQuiz.options;
        io.emit('question', questions.quiz[whichNumberQuestion]);
        whichNumberQuestion++;
    }
    else {
        whichNumberQuestion = 0;
    }
    
}



function sendResponseToFrontend(username, response) {
    
    //Input validation, gets rid of the extra stuff that could join the string
    let filteredUsername = username.replace(/["]/g,'').replace(/\n/g, '');
    let filteredResponse = response.replace(/["]/g,'')

    //Sends a response to OUR front-end with a username and response, that we got given from the client.
    io.emit('usr&res', (`${filteredUsername} : ${filteredResponse}\n`));
    
}

                                //SERVER INPUT

//Listens for incoming post-requests
app.post('/', (req, res) => {
    //Saves the POST-Request we just received into a new variable.
    let postresult = req.body;
    
    //Result is divied into seperate values here
    let brukernavn = JSON.stringify(postresult.brukernavn);
    let svar = JSON.stringify(postresult.svar);
    

    //VerifySvar is a funksjon that will check if client response is correct or wrong, and will return true or false.
    //It also sends a response back to the sender, whether or not their response is correct. This can be used for answer verification on the client side.
    //New bool made to give feedback to the client application whether or not their submission was correct.
    let responseToClient;

   try{ if(verifySvar(svar)) {
    responseToClient = true;
    }
    else {
    responseToClient = false;
    }}
    catch(err) {
        responseToClient = false;
    }
    //Calls sendResponseToFrontend, sends the username and response to the big screen! 
    sendResponseToFrontend(brukernavn, svar);

    //A response for the client that sends the post request: is either true or false, depending on whether or not the question is correct
    res.send(responseToClient);
});

//SOCKET.IO, waits for clients to connect instead of regular POST-requests. 
io.on('connection', (socket) => {
    //Venter på at klienten skal sende en 'usr&response' melding, og tar inn brukernavn og svar
    //Waits for the client to send a 'usr&response' string, and takes out username and response, logs it, and sends it to our frontend.
    socket.on('usr&response', ({brukernavn, svar}) => {
        console.log(`${brukernavn}: ${svar}`);
        sendResponseToFrontend(brukernavn, svar);
    })
})


//VERIFIES WHETHER OR NOT THE RESPONSE IS CORRECT
function verifySvar(svar) {
    //Removes unnecessary "" from the received string
    let optionId = svar.replace(/["]/g,'')

    // Find the option object with the same id
    const option = currentOption.find(o => o.id === optionId);

    // Check if the option has the isCorrect trait
    if (option.isCorrect) {
    return true;
    } else {
    return false;
    }
}




//-------------------------------------------------------------------------------------


//RUNS THE SERVER
server.listen(port, () => {
    console.log(`Server is now listening on port ${port}`);

})