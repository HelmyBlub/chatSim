Tasks:
- first chat interactions
    - choose trait
        - command could be !trait <choise>
            - steps:
                - citizen property: traits: string[]
                - types trait
                    - name
                    - opposite?
                - function citizenAddTrait
                - available trait list

                - if chatter writes "!trait <>"
                    - call citizenAddTrait
                        - checks if it is in allwed trait list
                        - each trait does need an add<name>Trait function
                            - earlyBird need to set wakeUpTime
                            -

            - early bird or night owl
                - otherwise will be randomised
                - check how changing it of an existing citizen can affect their sleep cycle
            - only one can be choosen
                - overwrites each other
            - check: is stored at chatter
    - how to visualize to chatter what he can do to change his citizen behavior?
        - what jobs do exist?
    - don't just consider commands. Set stuff based on chat messages
        - if ceraint words are seen in chat => set traits/jobs
        - advertisment bots messages -> make citizen want to be food market
            - check in message: "add me on discord"
                -> set dream job "food market"
                - trait ideas: "idiot", "scammer", "robot"
            - check in message: "cheap viewers"
                -> to decide
    

---------------------------------------------------
Tasks done today:
    - choose "dream job"
        - steps:
            - make property for citizen
            - make property for chatter
            - set when command is typed in chat
            - display in selected data
            - make citizen act on it
        - citizen will try to become it, if it exist
        - dream job is displayed when selected
        - stored at chatter
        - if citizen inizialized in new run, should remember
        - should allow unvalid choices
            - future feature to implement job
            - can only be one
        - command could be: !job <choise>


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
            second vision step:
                - big map
                - mushrooms and tree do not just instantly respawn
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


