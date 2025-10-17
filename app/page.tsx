"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronRight, Play, Pause, Users } from "lucide-react"
import { cn } from "@/lib/utils"

type Intervention = {
  name: string
  number: number
  action: "START" | "CONTINUE" | "AVOID"
  frequency?: string
  time?: string
  scientific_rationale: string
  details: Array<{
    Field: string
    Details: string
  }>
  parameters: Array<{
    Field: string
    Value: string
  }>
  target_biomarkers: Array<{
    Biomarker: string
    Status: string
  }>
  ranking: number
  personalized_note?: string
  lifestyle_context?: string
}

type Protocol = {
  protocol_type: string
  title: string
  interventions: Intervention[]
  total_interventions: number
}

type User = {
  id: string
  name: string
  initials: string
  description: string
}

const getActionColor = (action: string) => {
  switch (action) {
    case "START":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    case "CONTINUE":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    case "AVOID":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "ABOVE_REF_RANGE":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
    case "BELOW_REF_RANGE":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    case "NORMAL":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    case "OPTIMAL":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  }
}

const getProtocolIcon = (type: string) => {
  switch (type) {
    case "exercise":
      return "🏃‍♂️"
    case "nutrition":
      return "🥗"
    case "supplements":
      return "💊"
    default:
      return "📋"
  }
}

const getAudioFile = (type: string, userId: string) => {
  switch (type) {
    case "exercise":
      return `/data/${userId}_exercise.mp3`
    case "nutrition":
      return `/data/${userId}_nutrition.mp3`
    case "supplements":
      return `/data/${userId}_supplements.mp3`
    default:
      return ""
  }
}

const getAudioButtonText = (type: string) => {
  switch (type) {
    case "exercise":
      return "Explain my exercise plan"
    case "nutrition":
      return "Explain my nutrition plan"
    case "supplements":
      return "Explain my supplements"
    default:
      return "Play audio guide"
  }
}

  const users: User[] = [
    {
      id: "nik",
      name: "Nik",
      initials: "N",
      description: "33-year-old male, active lifestyle"
    },
    {
      id: "tyler", 
      name: "Tyler",
      initials: "T",
      description: "Active male, comprehensive data"
    },
    {
      id: "katie",
      name: "Katie", 
      initials: "K",
      description: "40-year-old female, postpartum"
    },
    {
      id: "arnav",
      name: "Arnav",
      initials: "A",
      description: "19-year-old male, vegetarian athlete"
    }
  ]

export default function ProtocolViewer() {
  const [selectedUser, setSelectedUser] = useState<User>(users[0]) // Default to Nik
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null)
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null)
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [audioRefs, setAudioRefs] = useState<{ [key: string]: HTMLAudioElement }>({})
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: number }>({})
  const [audioDuration, setAudioDuration] = useState<{ [key: string]: number }>({})
  const [showUserSelector, setShowUserSelector] = useState(false)

  useEffect(() => {
    const loadProtocols = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const [supplementsRes, nutritionRes, exerciseRes] = await Promise.all([
          fetch(`/data/${selectedUser.id}_supplements.json`),
          fetch(`/data/${selectedUser.id}_nutrition.json`),
          fetch(`/data/${selectedUser.id}_exercise.json`)
        ])

        if (!supplementsRes.ok || !nutritionRes.ok || !exerciseRes.ok) {
          throw new Error('Failed to load protocol data')
        }

        const [supplements, nutrition, exercise] = await Promise.all([
          supplementsRes.json(),
          nutritionRes.json(),
          exerciseRes.json()
        ])

        // Order: supplements, nutrition, exercise
        setProtocols([supplements, nutrition, exercise])
      } catch (error) {
        console.error('Error loading protocols:', error)
        setError('Failed to load protocol data. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    loadProtocols()
  }, [selectedUser])

  const handlePlayPause = (protocolType: string) => {
    const audioFile = getAudioFile(protocolType, selectedUser.id)
    if (!audioFile) return

    // Create audio element if it doesn't exist
    if (!audioRefs[protocolType]) {
      const audio = new Audio(audioFile)
      
      // Set up event listeners
      audio.addEventListener('ended', () => {
        setPlayingAudio(null)
        setAudioProgress(prev => ({ ...prev, [protocolType]: 0 }))
      })
      
      audio.addEventListener('pause', () => setPlayingAudio(null))
      
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(prev => ({ ...prev, [protocolType]: audio.duration }))
      })
      
      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          const progress = (audio.currentTime / audio.duration) * 100
          setAudioProgress(prev => ({ ...prev, [protocolType]: progress }))
        }
      })
      
      // Add error handling for audio loading
      audio.addEventListener('error', (e) => {
        console.error(`Error loading audio for ${protocolType}:`, e)
        setPlayingAudio(null)
      })
      
      setAudioRefs(prev => ({ ...prev, [protocolType]: audio }))
    }

    const audio = audioRefs[protocolType]
    
    // Add null check to prevent runtime errors
    if (!audio) {
      console.error(`Audio element not found for ${protocolType}`)
      return
    }
    
    if (playingAudio === protocolType) {
      // Currently playing this audio, so pause it
      try {
        audio.pause()
        setPlayingAudio(null)
      } catch (error) {
        console.error('Error pausing audio:', error)
        setPlayingAudio(null)
      }
    } else {
      // Pause any currently playing audio
      Object.values(audioRefs).forEach(a => {
        if (a && a !== audio) {
          try {
            a.pause()
          } catch (error) {
            console.error('Error pausing other audio:', error)
          }
        }
      })
      
      // Play the selected audio with error handling
      try {
        audio.play().catch(error => {
          console.error('Error playing audio:', error)
          setPlayingAudio(null)
        })
        setPlayingAudio(protocolType)
      } catch (error) {
        console.error('Error playing audio:', error)
        setPlayingAudio(null)
      }
    }
  }

  const handleSeek = (protocolType: string, event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRefs[protocolType]
    if (!audio || !audio.duration) return

    try {
      const rect = event.currentTarget.getBoundingClientRect()
      const clickX = event.clientX - rect.left
      const width = rect.width
      const percentage = clickX / width
      const newTime = percentage * audio.duration

      audio.currentTime = newTime
      setAudioProgress(prev => ({ ...prev, [protocolType]: percentage * 100 }))
    } catch (error) {
      console.error('Error seeking audio:', error)
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (selectedIntervention && selectedProtocol) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto bg-background">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedIntervention(null)}
              className="rounded-full bg-gray-100 dark:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-balance mb-2">{selectedIntervention.name}</h1>
              <p className="text-muted-foreground text-pretty">
                {selectedIntervention.details.find((d) => d.Field === "Description")?.Details}
              </p>
            </div>

            {/* Parameters */}
            <div className="space-y-3">
              {selectedIntervention.parameters.map((param, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="font-medium">{param.Field}</span>
                  <span className="text-muted-foreground">{param.Value}</span>
                </div>
              ))}
            </div>

            {/* Action Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Taking this positively impacts</span>
            </div>

            {/* Target Biomarkers */}
            <div className="flex flex-wrap gap-2">
              {selectedIntervention.target_biomarkers.slice(0, 4).map((biomarker, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className={cn("text-xs px-3 py-1 rounded-full", getStatusColor(biomarker.Status))}
                >
                  {biomarker.Biomarker}
                </Badge>
              ))}
            </div>

            {/* Scientific Rationale */}
            <div className="space-y-3">
              <h3 className="font-semibold">Scientific Rationale</h3>
              <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                {selectedIntervention.scientific_rationale}
              </p>
            </div>

            {/* Personalized Note */}
            {selectedIntervention.personalized_note && (
              <div className="space-y-3">
                <h3 className="font-semibold">Personalized Note</h3>
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                  {selectedIntervention.personalized_note}
                </p>
              </div>
            )}

            {/* Lifestyle Context */}
            {selectedIntervention.lifestyle_context && (
              <div className="space-y-3">
                <h3 className="font-semibold">What This Means for Your Lifestyle</h3>
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                  {selectedIntervention.lifestyle_context}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto bg-background">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">h.</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserSelector(!showUserSelector)}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                <span className="text-xs text-muted-foreground">{selectedUser.initials}</span>
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Last updated: March 15, 2025</p>
          
          {/* User Selector */}
          {showUserSelector && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Select User:</p>
              {users.map((user) => (
                <Button
                  key={user.id}
                  variant={selectedUser.id === user.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setSelectedUser(user)
                    setShowUserSelector(false)
                    // Reset audio state when switching users
                    setPlayingAudio(null)
                    setAudioRefs({})
                    setAudioProgress({})
                    setAudioDuration({})
                  }}
                  className="w-full justify-start text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{user.initials}</span>
                    <div className="text-left">
                      <div className="text-xs font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.description}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="p-4 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-balance mb-2">{selectedUser.name}'s 100 day action plan</h2>
            <p className="text-sm text-muted-foreground text-pretty">
              {selectedUser.description} - Here's how {selectedUser.name} can actively target their biomarkers and optimize their health.
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading {selectedUser.name}'s protocol...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Protocol Sections */}
          {!loading && !error && protocols.map((protocol) => (
            <Card key={protocol.protocol_type} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getProtocolIcon(protocol.protocol_type)}</span>
                  <CardTitle className="text-lg">{protocol.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* MP3 Player Section */}
                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <div className="flex items-center justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlayPause(protocol.protocol_type)}
                      className="flex items-center gap-2"
                    >
                      {playingAudio === protocol.protocol_type ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {playingAudio === protocol.protocol_type ? 'Pause' : getAudioButtonText(protocol.protocol_type)}
                    </Button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div 
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer relative"
                      onClick={(e) => handleSeek(protocol.protocol_type, e)}
                    >
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-100"
                        style={{ width: `${audioProgress[protocol.protocol_type] || 0}%` }}
                      />
                    </div>
                    
                    {/* Time Display */}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {audioRefs[protocol.protocol_type] && audioRefs[protocol.protocol_type].currentTime !== undefined
                          ? formatTime(audioRefs[protocol.protocol_type].currentTime)
                          : '0:00'
                        }
                      </span>
                      <span>
                        {audioDuration[protocol.protocol_type] 
                          ? formatTime(audioDuration[protocol.protocol_type])
                          : '0:00'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* All Interventions */}
                {protocol.interventions.map((intervention) => (
                  <div
                    key={intervention.number}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedIntervention(intervention)
                      setSelectedProtocol(protocol)
                    }}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{intervention.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {intervention.details.find((d) => d.Field === "Benefit Summary")?.Details}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn("text-xs px-2 py-1 rounded-full", getActionColor(intervention.action))}
                      >
                        {intervention.action}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

        
        </div>
      </div>
    </div>
  )
}