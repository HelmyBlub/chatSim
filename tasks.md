Tasks:
- thinking about what to do next
    - too many options
    - nothing feels right as the next one
    - very unsure about what feature is next

---------------------------------------------------
Tasks done today:
- randomize jobs of citizen
    - currently all end up in building consturction
- very big map
    - make map very big
    - check why mushroom/tree spawn take so much time
    - check paint performance
    - improved building performance
     - only paint what is seen at least chunk related stuff
    - use map chunks and check performance
        - change behvaior to consider only close chunks for checks and not every single chunk
        - old check perforamnce
            - testcase: performance 10 citizens,    time: 2409.90
            - testcase: performance 100 citizens,   time: 4232.00
            - testcase: performance 10000 citizens, time: 6156.70
        - new
            testcase: performance 10 citizens,      time: 4419.80
            testcase: performance 100 citizens,     time: 3904.20
            testcase: performance 10000 citizens,   time: 4224.30
    - use map chunks and check performance
        - change behvaior to consider only close chunks for checks and not every single chunk
        - wood gathering needs searching behavior like food gatherer


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
                - options: 
                    - improve citizen behavior
                        - they always forget what they were doing when a more important needs pops up
                            - stoping customer interaction just to eat at home
                                - they could wait for a better fitting moment
                            - running back home to put something in storage, but when they see their borken home, they want to repair it        directly, forgetting that they wanted to store stuff
                            - want to bring stuff to their market but on the way forget about it
                    - buy/rent buildings
                        - currenty just taken without compensation
                            - see some property which nobody own
                            - find the owner and ask
                    - some system for random interactions between citizens?
                        - some say "hello neighbour"
                    - make citizen some social meter
                        - no social interaction as extrovert -> want to commit suicide
                    - citizen have "working job" hours and "free time"
                        - add "free time" and some social or private activities
                        - social activity could be talking with neigbours
                    - citizens can steal food
                            
                        
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
                - society should work with 1 or 10000 inhabitant/chatter
                - should progress through ages/technologies
                - world starts with trees and stones and some type of forest food
                - inhabitants build town own their own
                    - cut down trees for wood -> build wood house with it
                    - gather fruits/meats for food
                    - each inhabitant can have job


