Tasks:
- add first sounds?
    - required sounds
        - tree falling
        - dog sounds when interacting
        - sleep sound
        - background music
    - how does sound...
        - virtual machine has sound delay. Should i care?
            - check if can be avoided. Game should not care about it, but could be fixed by some VM setting?
- more images+animations
    - trading animation
        - money image
        - after successfull "negotiation" do "trade"
        - on trade move money and item between citizens
            - successfull trade steps
                - customer put money on counter for marketCitizen
                - and takes item from market inventory
                - marketCitizen takes money from counter into own inventory

            - currently market trade does money + items at the same time. But it should happen separately, so customer can take without paying or leave forgetting to take items after paying
            - currently happes instantly and code relies on it, which makes it hard to put animation between
            - item or money move should have some generall code
            - "setStatePutMoney" from citizen to building (counter) of market.
                - animate
                - marketCitizen takes from counter into his inventory
            - "setStateTradeItem" from citizen to citizen
                - animate
            - 
- refactor "need food", "need starving"
    - not using new state stack properly?

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
- sound:
    - tree cutting with variations
    - pickup mushroom: 
        - make account off stream for freesound. Download on stream?
        - option: https://freesound.org/people/edsward/sounds/343097/?
        - credit file
    - hammer sound
        - building construction
        - repairing


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


