# Installations

+ In order to install the chatbot, many installations are necessaries.
 First of all, you have to install NGINX on the server which will run the website.

+ Once NGINX is installed, you have to put the nginx.conf file (located at the root of the project archive) in the configuration folder of NGINX (default in /etc/nginx/conf.d)

+ You then have to install RASA NLU and its functionnal components : refer to the RASA project's documentation. (foler website/chatbot/readme.html or readme.md)

# Setting up the website

Put the 3 folders "chatbot", "final" and "proxy" in the folder "website" of the archive chatbotproject.7z in the shared folders of your NGINX server.

# Setting up the RASA NLU HTTP Server

Go in the "chatbot" folder with a cmd and run the command "nohup ./run.sh". Refer to the RASA project's documentation for more informations.

# Final testing

The different elements of the project are put in place. You now only have to access to the website thanks to a web browers and test it.
Take some time to read the RASA documentation (rasa.ai) and the RASA project's documentation if necessary ; it will guide you through the set up of the RASA *Natural Language Understanding* API .

