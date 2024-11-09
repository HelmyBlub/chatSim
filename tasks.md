Tasks:
- separater from overlay app
    - move stuff
- have a "world map", finite size
- mushrooms grow randomly
- when someone writes a chat message, a character with his name joins the world
- characters have hunger stat
    - when hungry search for food
    - can starve to death

Big Idea:
- do some game for chatters.
    - chatter can play something while i do coding
    - chatter are "just" audiance and can emote somehow
        - think about simple options
        - command "throw ball"
    - chatter are a type of input for a game i build
        - idea: chatSim
            start steps/MVP:
                - when new chatter writes something in chat -> add chatter as citizen to world
                    - starts with no house/food, getInitial money.Total game money limited by this?
                    - automatically search for starting job:
                        - first two jobs are for food and wood
                - automatically decides to get food if low on food
                    - if market has food -> buy it with money
                        - if no money and job-> steal food?
                    - if no food and no job -> get job for creating food like farmer
                - automatically decides to get house if no house
                    - if no house to rent available -> get job to build houses
                    - if house avaiable -> rent it
            big vision:
                - each chatter becomes a citizen of a game world
                    - moves mostly by itself but chatter can influence his citizen
                    - can die, or become successful and rich
                - i as a streamer am the god. Can set rules. 
                    - i make money from taxes. I can build stuff with my money or spend on goverment jobs
                        - income tax
                        - other taxes
                    - i can set taxes. Based on tax income i can set who gets what amount of money.
                        - teachers/schools -> research, more efficient workers
                        - police  -> to few -> more stealing/destroying
                        - firefighers -> to few -> fires might destroy houses more
                        - "health care" -> no health care -> poor people will die
                                - citizen ganes stats for everything he does. Dying meas stats are lost. 
                    - like citybuilder games: mark housing areas, shopping areas. Otherwise inhabitant will build where they want, could be bad if city grows big
                    - set area for forest replanting, so enough wood is available long term
                    - to have police i need to set taxes. Based on tax income i can employ x number of police
                        - if crime is to big, my police might not be enough. if low crime i can save on police money
                - as a chatter i can choose my "job"
                    - criminal -> steal stuff, destroy stuff
                    - police -> fight criminals
                    - medic -> heal injured
                    - farmer -> plant food
                    - go on strike -> stops working
                        - put up strike message
                - simulate resouces: the more workers gather wood, the more wood, prices for wood go down
                    - resourse have to be transported
                - game should simulate some society
                - society should work with 1 or 1000 inhabitant/chatter
                - should progress through ages/technologies
                - world starts with trees and stones and some type of forest food
                - inhabitants build town own their own
                    - cut down trees for wood -> build wood house with it
                    - gather fruits/meats for food
                    - each inhabitant can have job


Tasks done today:
- outfits. Dogs can wear clothing. Store choices for chatters even when leaving
    - outfits only for sitting?
    - command: 
        - glasses 1, sunglasses
            - no glasses
- baking game:
    - take cookies out on time with command
        - anyone can do it
    - put into cookie jar
            
    - eat cooking (only possible if cookies left).
    - bake cookie
        - baked cookies are for every chatter
