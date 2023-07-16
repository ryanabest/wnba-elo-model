require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ryan.a.best@gmail.com',
    pass: process.env.GMAIL
  }
});

const mailOptions = {
  subject: '📢 ~GAME ENDED~ : WAS @ CHI (71-69) -- 72a38525-e26f-45d9-b96d-5812824bf931',
  from: 'ryan.a.best@gmail.com',
  to: 'ryan.a.best@gmail.com',
  text: '🤖 WNBA Forecast Bot'
}

const sendEmail = (mailOptions) => {
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  }); 
}

sendEmail(mailOptions);