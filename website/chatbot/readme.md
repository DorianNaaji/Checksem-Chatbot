# RASA NLU
 
This documentation explains how to set up and configure RASA NLU for your server. (In our case, we used NGINX)


# Before diving in - installation

Set up rasa NLU and the backends

> pip install rasa_nlu
  pip install -U spacy"

> python -m spacy download en
  python -m spacy download fr
 
> pip install -U scikit-learn scipy sklearn-crfsuite

See more @https://nlu.rasa.ai/installation.html

# Create the datasets

## data.json files

These files contain all the essentiel datas to develop the chatbot. It includes texts to be interpreted, in structured data (intent/entities).

### chatbot\data\data_en.json

data_en.json was obtained on the website [luis.ai](https://www.luis.ai/) where we defined different intent and entities for our chatbot, then we exported our bot to a .json file. From this website and the two following ones, you can also make XMLHTTP requests to parse texts and obtain structured data, as a remplacement to RASA NLU. But, with RASA :

 + it's open-source
 + you don’t have to hand over your data to FB/MSFT/GOOG
 + allow you **a lot** (really, **A LOT**) of different configurations
 + offers way more possibilities to develop chatbots
 + run multiple projects LOCALY
 + use RASA CORE in complement of RASA NLU
 + see [this blog post](https://medium.com/rasa-blog/do-it-yourself-nlp-for-bot-developers-2e2da2817f3d) for more arguments...

 To create this data.json file, different tools are also available and compatible with rasa_nlu  :

 + [diagflow](https://dialogflow.com/)
 + [wit.ai](https://wit.ai/)
 + and more...
 
See [RASA migration doc](https://nlu.rasa.ai/migrating.html#migrating-an-existing-app) for more informations

### chatbot\data\data_fr.json

Also you can use a tool from rasa to edit your training exemples
This is the tool we used for data_fr.json
It is available [there (git repos)](https://github.com/RasaHQ/rasa-nlu-trainer)
It also offers an [online version](https://rasahq.github.io/rasa-nlu-trainer/)
Or you can also install it with npm (see the github repos)

# Configuration

## config.json files

The config.json files contains all the different informations for running the HTTP server and different informations about **one** project that is to say you need *ONE* config file *PER* project you may run on your HTTP SERVER. You can use the same port for diffent project, but you'll need to precise the project you want to use for the text to parse (see #Run a Request)
see more @ https://nlu.rasa.ai/config.html#section-configuration
Pay attention to this file. If not configured well, you may have problems.
For our project, we have two config files. One for the english language and another for the french language.


## project :
@ https://nlu.rasa.ai/config.html#project

## fixed_model_name
@ https://nlu.rasa.ai/config.html#fixed-model-name

## pipeline
@ https://nlu.rasa.ai/config.html#pipeline

## language
@ https://nlu.rasa.ai/config.html#language

## path
@ https://nlu.rasa.ai/config.html#path

## data
@ https://nlu.rasa.ai/config.html#data
(has to be changed if you want to use another dataset)

# Train the model

To train both datasets, use the commands
 > python -m rasa_nlu.train -c config/config_fr.json
 > python -m rasa_nlu.train -c config/config_en.json

Where the argument **-c** is the adress of the .json file to train

It creates all the data necessary for the chatbot in the folder
"chatbot\nlu_data\"
(the name of the directories can be changed by changing the config.json files).

See more @https://nlu.rasa.ai/tutorial.html#tutorial


# Run the server - use the model

 + Make sure to install win32api
 > pip install pypiwin32


 > python -m rasa_nlu.server -c config/config_en.json

See more @https://nlu.rasa.ai/http.html#running-the-server


# Run a request

## On navigator :

 + "Hello :"
 > http://localhost:5000/parse?q=hello&project=chatbot_en

 + "Give me the meaning of Apple :"
 > http://localhost:5000/parse?q=Give%20me%20the%20meaning%20of%20apple&project=chatbot_en

 + "What is a car ?"
 > http://localhost:5000/parse?q=What%20is%20a%20car&project=chatbot_en

### port (5000)
5000 here is the port where runs the RASA NLU API. You can change it in the config files.

### parse?q=

Everything on the right of "parse?q=" is the sentence to parse : it will be the text from the user, that will be converted into structured data.

### &project=

If you run multiple projects, everything on the right of "&project=" specifies the project which will be used to analyze the text.
See more @https://nlu.rasa.ai/http.html#running-the-server
and @https://nlu.rasa.ai/config.html


## On cmd :

### Make sure to install curl and mjson

 + see @https://curl.haxx.se/download.html
 + pip install mjson (see @https://pypi.python.org/pypi/mjson)

### Examples 

 + "Hello"
 > url -POST localhost:5000/parse?q=hello | python -mjson.tool

 + "Give me the meaning of turtle"
 > curl -POST localhost:5000/parse?q=Give%20me%20the%20meaning%20of%20turtle | python -mjson.tool

 + "Synonyms of bee"
 > curl -POST localhost:5000/parse?q=Synonyms%20of%20bee | python -mjson.tool

 + "Traduction of bread"
 > curl -POST localhost:5000/parse?q=Traduction%20of%20bread | python -mjson.tool


## How to run the HTTP rasa Server permanently

 + Just use nohup, and run the "run.sh" bash command containing the line to start the HTTP server :

 > nohup ./run.sh

 *don't forget to run "chmod +x run.sh" to have the rights*

 And it will run the server in background, even if you close the SSH connexion (putty for example)
 and will write the logs by default in nohup.out

 + Then if you want to stop the RASA HTTP Server just find out what is the PID of the script process with 

 > ps -ef

 And just run 

 > kill [PID] 

 where [PID] is the PID of the process you want to stop.

 @see https://fr.wikipedia.org/wiki/Nohup

# License

see licence.txt file or [this page](https://nlu.rasa.ai/license.html)