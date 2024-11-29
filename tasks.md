Tasks:
- more images+animations
    - visualize citizen transporting wood planks
    - sleeping dog image
    - eating animation
    - don't move directly to the middle
        - lumberjack walks besides tree, (left and right)
            - can not be more than two people cutting?
    - trading animation

- selecting click should select closest not first
- mushroom pickup behavior
    - vision radius different for night and day
- zoom in to mouse cursor not map middle

- pathing, citizen can not move over "private property"
- job "food market"
    - if many mushrooms on stock, buy them for less
    - if low on mushrooms, sell for more
    - can eat their own mushrooms
- job "food gatherer"
    - try to sell for highest price
- chatter can fix their prices?
- citizen can decide to go buy mushrooms from food market
- streamer can set limits which citizen are not allowed to break
    - only allowed to break if they flag themselfes as criminal
- chatter blacklist?, way to remove unwanted chatters like bots

- use images
    - hungry citizen visualized
    - starving citizen visualization
    - sleepy

---------------------------------------------------
Tasks done today:
- death image
    - disappear after time
    - on select display death reason
- speech interaction
    - make speech work for selling
- more action log displays
- changed: market invetory display 


--------------------------------------------------
Big Idea:
- do some game for chatters.
    - chatter can play something while i do coding
    - chatter are "just" audiance and can emote somehow
        - think about simple options
        - command "throw ball"
    - chatter are a type of input for a game i build
        - idea: chatSim
            next vision step:
                first chat interactions
                - "citizen traits"
                    - something which makes citizen behave differently. Which can be modified by chatters
                        - like trait: "earlybird", wakes up early
                        - trait "nightowl". goes to bed late
                -  chatter can input dream job
                    - dream job will be saved. Citizen will do this job if possible
                    - dream job could be something not yet implemented as a way for me to see what i could implement in the future                    
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


